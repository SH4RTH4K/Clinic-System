<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePatientRequest;
use App\Http\Requests\Admin\UpdatePatientRequest;
use App\Models\AppointmentRequest;
use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\PatientNumberingProfile;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use App\Services\Admin\AppointmentRequestPatientMatcher;
use App\Services\Admin\ClinicalAccessAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $query = Patient::query();
        if ($request->search) {
            $query->where(fn ($q) => $q->where('name', 'like', '%'.$request->search.'%')
                ->orWhere('phone', 'like', '%'.$request->search.'%')
                ->orWhere('patient_no', 'like', '%'.$request->search.'%')
                ->orWhere('patient_code', 'like', '%'.$request->search.'%'));
        }

        return Inertia::render('Admin/Patients/Index', [
            'patients' => $query
                ->select([
                    'id', 'patient_no', 'patient_series', 'patient_code', 'patient_category',
                    'name', 'guardian_name', 'guardian_relationship', 'guardian_relationship_custom',
                    'gender', 'age_years', 'age_months', 'age_days', 'dob', 'phone',
                ])
                ->latest()
                ->paginate(10)
                ->withQueryString(),
            'filters' => $request->only(['search']),
            'relationshipOptions' => ClinicSetting::currentPatientRelationshipOptions(),
        ]);
    }

    /**
     * Lightweight async patient search for visit forms.
     * Returns only non-sensitive identifying fields; max 10 results.
     */
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2|max:100',
        ]);

        $term = $request->q;

        $patients = Patient::select('id', 'patient_no', 'patient_series', 'patient_code', 'patient_category', 'name', 'age_years', 'age_months', 'age_days', 'gender')
            ->where(fn ($q) => $q->where('name', 'like', '%'.$term.'%')
                ->orWhere('phone', 'like', '%'.$term.'%')
                ->orWhere('patient_no', 'like', '%'.$term.'%')
                ->orWhere('patient_series', 'like', '%'.$term.'%')
                ->orWhere('patient_code', 'like', '%'.$term.'%'))
            ->orderBy('name')
            ->limit(10)
            ->get();

        return response()->json($patients);
    }

    public function create(Request $request, AppointmentRequestPatientMatcher $patientMatcher)
    {
        $appointmentRequest = null;

        if ($request->filled('appointment_request_id')) {
            $request->validate([
                'appointment_request_id' => ['required', 'integer', 'exists:appointment_requests,id'],
            ]);

            $user = $request->user();
            abort_unless($user?->hasRole('Super Admin') || $user?->can('appointments.update'), 403);

            $appointmentRequest = AppointmentRequest::query()->findOrFail($request->integer('appointment_request_id'));

            if ($appointmentRequest->converted_patient_id !== null) {
                return redirect()->route('admin.appointment_requests.index')
                    ->with('warning', 'This appointment request has already been linked to a patient. No duplicate patient was created.');
            }

            if ($patientMatcher->matchesFor($appointmentRequest)->isNotEmpty()) {
                return redirect()->route('admin.appointment_requests.index')
                    ->with('warning', 'A matching patient already exists. Link the existing record rather than creating a duplicate.');
            }
        }

        $canViewClinicalRecords = $request->user()?->can('clinical_records.view') === true;
        $numberingProfiles = PatientNumberingProfile::query()
            ->where('is_active', true)
            ->with('sequences')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(function (PatientNumberingProfile $profile): array {
                $periodKey = $profile->reset_annually ? now()->format('Y') : 'all';
                $nextNumber = $profile->sequences->firstWhere('period_key', $periodKey)?->next_number
                    ?? $profile->starting_number;

                return [
                    'id' => $profile->id,
                    'name' => $profile->name,
                    'category' => $profile->category,
                    'is_default' => $profile->is_default,
                    'preview' => $profile->formatPatientIdentifier($nextNumber),
                ];
            });

        return Inertia::render('Admin/Patients/Create', [
            'defaults' => $appointmentRequest === null
                ? $request->only(['name', 'phone'])
                : ['name' => $appointmentRequest->name, 'phone' => $appointmentRequest->phone],
            'appointmentRequestId' => $appointmentRequest?->id,
            'fieldConfig' => $this->patientFormConfig($canViewClinicalRecords),
            'canViewClinicalRecords' => $canViewClinicalRecords,
            'relationshipOptions' => ClinicSetting::currentPatientRelationshipOptions(),
            'numberingProfiles' => $numberingProfiles,
        ]);
    }

    public function store(StorePatientRequest $request, AppointmentRequestPatientMatcher $patientMatcher)
    {
        $validated = $request->validated();
        $appointmentRequestId = $validated['appointment_request_id'] ?? null;
        unset($validated['appointment_request_id']);

        $patient = null;
        DB::transaction(function () use ($validated, $appointmentRequestId, $patientMatcher, &$patient): void {
            $appointmentRequest = null;

            if ($appointmentRequestId !== null) {
                $appointmentRequest = AppointmentRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($appointmentRequestId);

                if ($appointmentRequest->converted_patient_id !== null) {
                    throw ValidationException::withMessages([
                        'appointment_request_id' => 'This appointment request has already been converted to a patient.',
                    ]);
                }

                if ($patientMatcher->matchesFor($appointmentRequest)->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        'appointment_request_id' => 'A matching patient already exists. Return to appointment requests and link the existing record.',
                    ]);
                }
            }

            $profile = PatientNumberingProfile::query()
                ->where('is_active', true)
                ->lockForUpdate()
                ->findOrFail($validated['patient_numbering_profile_id']);
            $periodKey = $profile->reset_annually ? now()->format('Y') : 'all';
            $sequence = $profile->sequences()->firstOrCreate(
                ['period_key' => $periodKey],
                ['next_number' => $profile->starting_number],
            );
            $number = $sequence->next_number;
            $sequence->update(['next_number' => $number + 1]);

            $settings = ClinicSetting::query()->firstOrFail();
            $this->ensurePatientRelationshipIsAvailable($validated, $settings);
            $series = $profile->seriesFor();
            $patientCode = $profile->formatPatientIdentifier($number);

            $patient = Patient::create(array_merge($validated, [
                'patient_no' => $number,
                'patient_series' => $series,
                'patient_numbering_profile_id' => $profile->id,
                'patient_category' => $profile->category,
                'patient_code' => $patientCode,
                'created_by' => Auth::id(),
            ]));

            if ($appointmentRequest !== null) {
                $appointmentRequest->converted_patient_id = $patient->id;
                $appointmentRequest->save();
                $appointmentRequest->events()->create([
                    'performed_by' => Auth::id(),
                    'performed_by_name' => Auth::user()?->name,
                    'event_type' => 'converted',
                    'previous_status' => $appointmentRequest->status,
                    'new_status' => $appointmentRequest->status,
                    'previous_scheduled_date' => $appointmentRequest->scheduled_date?->toDateString(),
                    'previous_scheduled_time' => $appointmentRequest->scheduled_time === null
                        ? null
                        : substr((string) $appointmentRequest->scheduled_time, 0, 5),
                    'new_scheduled_date' => $appointmentRequest->scheduled_date?->toDateString(),
                    'new_scheduled_time' => $appointmentRequest->scheduled_time === null
                        ? null
                        : substr((string) $appointmentRequest->scheduled_time, 0, 5),
                    'reason' => 'A patient record was created from this appointment request.',
                ]);
            }
        });

        if ($appointmentRequestId !== null) {
            return redirect()->route('admin.appointment_requests.index')
                ->with('success', 'Patient created and linked to the appointment request.');
        }

        return redirect()->route('admin.patients.index')->with('success', 'Patient created successfully.');
    }

    public function show(Request $request, Patient $patient, ClinicalAccessAuditService $audit)
    {
        $user = $request->user();
        abort_unless($user instanceof User, 403);

        $canViewClinicalRecords = $user->can('clinical_records.view');
        $patientDetails = $patient->only([
            'id',
            'patient_no',
            'patient_series',
            'patient_code',
            'name',
            'guardian_relationship',
            'guardian_relationship_custom',
            'guardian_name',
            'gender',
            'age_years',
            'age_months',
            'age_days',
            'dob',
            'phone',
            'address',
            'referred_by',
            'created_at',
        ]);
        $patientDetails['patient_identifier'] = $patient->patient_identifier;

        if ($canViewClinicalRecords) {
            $patientDetails['blood_group'] = $patient->blood_group;
            $patientDetails['known_allergies'] = $patient->known_allergies;
        }

        if ($canViewClinicalRecords && $user->can('visits.view')) {
            $patientDetails['visits'] = $patient->visits()
                ->select(['id', 'patient_id', 'visit_date', 'chief_complaint', 'status'])
                ->with([
                    'prescriptionItems' => fn ($query) => $query->select(['id', 'visit_id', 'medicine_id', 'sort_order']),
                    'prescriptionItems.medicine:id,name',
                ])
                ->latest()
                ->get()
                ->map(fn (Visit $visit): array => [
                    'id' => $visit->id,
                    'visit_date' => $visit->visit_date?->toDateString(),
                    'chief_complaint' => $visit->chief_complaint,
                    'status' => $visit->status,
                    'prescription_items' => $visit->prescriptionItems
                        ->map(fn (PrescriptionItem $item): array => [
                            'id' => $item->id,
                            'medicine' => $item->medicine === null
                                ? null
                                : ['id' => $item->medicine->id, 'name' => $item->medicine->name],
                        ])
                        ->values()
                        ->all(),
                ])
                ->values()
                ->all();
        }

        $audit->patientDetailViewed(
            $request,
            $user,
            $patient,
            array_key_exists('visits', $patientDetails),
        );

        return Inertia::render('Admin/Patients/Show', [
            'patient' => $patientDetails,
            'relationshipOptions' => ClinicSetting::currentPatientRelationshipOptions(),
        ]);
    }

    public function edit(Request $request, Patient $patient)
    {
        $canViewClinicalRecords = $request->user()?->can('clinical_records.view') === true;
        $patientDetails = $patient->only([
            'id', 'patient_no', 'patient_series', 'patient_code', 'patient_category',
            'name', 'guardian_name', 'guardian_relationship', 'guardian_relationship_custom',
            'gender', 'age_years', 'age_months', 'age_days', 'dob', 'phone', 'address',
            'referred_by',
        ]);

        if ($canViewClinicalRecords) {
            $patientDetails['blood_group'] = $patient->blood_group;
            $patientDetails['known_allergies'] = $patient->known_allergies;
        }

        $patientDetails['patient_identifier'] = $patient->patient_identifier;

        return Inertia::render('Admin/Patients/Edit', [
            'patient' => $patientDetails,
            'fieldConfig' => $this->patientFormConfig($canViewClinicalRecords),
            'canViewClinicalRecords' => $canViewClinicalRecords,
            'relationshipOptions' => ClinicSetting::currentPatientRelationshipOptions(),
        ]);
    }

    public function update(UpdatePatientRequest $request, Patient $patient)
    {
        $validated = $request->validated();

        if (array_key_exists('guardian_relationship', $validated) && $validated['guardian_relationship'] !== 'custom') {
            $validated['guardian_relationship_custom'] = null;
        }

        DB::transaction(function () use ($validated, $patient): void {
            $settings = ClinicSetting::query()->lockForUpdate()->first();
            $this->ensurePatientRelationshipIsAvailable($validated, $settings, $patient);
            $patient->update($validated);
        });

        return redirect()->route('admin.patients.index')->with('success', 'Patient updated successfully.');
    }

    public function destroy(Patient $patient)
    {
        $patient->delete();

        return redirect()->route('admin.patients.index')->with('success', 'Patient deleted successfully.');
    }

    /**
     * Recheck mutable relationship configuration while holding its settings row lock.
     *
     * @param  array<string, mixed>  $validated
     */
    private function ensurePatientRelationshipIsAvailable(array $validated, ?ClinicSetting $settings, ?Patient $patient = null): void
    {
        $relationshipValue = $validated['guardian_relationship'] ?? null;

        if ($relationshipValue === null || $relationshipValue === $patient?->guardian_relationship) {
            return;
        }

        $availableValues = array_column(
            $settings?->getPatientRelationshipOptions() ?? ClinicSetting::defaultPatientRelationshipOptions(),
            'value',
        );

        if (! in_array($relationshipValue, $availableValues, true)) {
            throw ValidationException::withMessages([
                'guardian_relationship' => 'The selected relationship is no longer available. Refresh the form and choose an available option.',
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function patientFormConfig(bool $canViewClinicalRecords): array
    {
        $fieldConfig = ClinicSetting::currentPatientFormConfig();

        if (! $canViewClinicalRecords) {
            $fieldConfig['blood_group']['visible'] = false;
            $fieldConfig['known_allergies']['visible'] = false;
        }

        return $fieldConfig;
    }
}
