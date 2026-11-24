<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePatientRequest;
use App\Http\Requests\Admin\UpdatePatientRequest;
use App\Models\AppointmentRequest;
use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\PatientAttachment;
use App\Models\PatientNumberingProfile;
use App\Models\PatientQueueToken;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use App\Services\Admin\AppointmentRequestPatientMatcher;
use App\Services\Admin\ClinicalAccessAuditService;
use App\Services\BarcodeService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $query = Patient::query();

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('guardian_name')) {
            $query->where('guardian_name', 'like', '%'.trim($request->guardian_name).'%');
        }

        if ($request->filled('gender') && in_array($request->gender, ['male', 'female', 'other'], true)) {
            $query->where('gender', $request->gender);
        }

        if ($request->filled('blood_group')) {
            $query->where('blood_group', $request->blood_group);
        }

        if ($request->filled('date_filter')) {
            match ($request->date_filter) {
                'today' => $query->whereDate('created_at', now()->toDateString()),
                'this_week' => $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]),
                'this_month' => $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
                default => null,
            };
        }

        $today = now()->toDateString();
        $canViewClinicalRecords = $request->user()?->can('clinical_records.view') === true;

        $kpis = [
            'total_patients' => Patient::count(),
            'registered_today' => Patient::whereDate('created_at', $today)->count(),
            'in_queue_today' => PatientQueueToken::whereDate('token_date', $today)
                ->whereIn('status', ['waiting', 'calling', 'in_consultation'])
                ->count(),
            'total_visits' => Visit::count(),
        ];

        $selectColumns = [
            'id', 'patient_no', 'patient_series', 'patient_code', 'patient_category',
            'old_or_other_id',
            'name', 'reference_number', 'guardian_name', 'guardian_relationship', 'guardian_relationship_custom',
            'gender', 'age_years', 'age_months', 'age_days', 'dob', 'phone', 'photo_path', 'created_at',
            'manual_last_visit_date', 'legacy_visits_count',
        ];

        if ($canViewClinicalRecords) {
            $selectColumns[] = 'blood_group';
        }

        $paginated = $query
            ->select($selectColumns)
            ->withCount('visits')
            ->withMax('visits', 'visit_date')
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $patientIds = $paginated->pluck('id');
        if ($patientIds->isNotEmpty()) {
            $todayTokens = PatientQueueToken::query()
                ->whereDate('token_date', $today)
                ->whereIn('patient_id', $patientIds)
                ->latest('id')
                ->get()
                ->keyBy('patient_id');

            $paginated->getCollection()->transform(function ($patient) use ($todayTokens) {
                $patient->today_queue_token = $todayTokens->get($patient->id);
                $patient->effective_last_visit_date = $patient->effective_last_visit_date;
                $patient->effective_visits_count = $patient->effective_visits_count;

                return $patient;
            });
        }

        return Inertia::render('Admin/Patients/Index', [
            'patients' => $paginated,
            'filters' => $request->only(['search', 'guardian_name', 'gender', 'blood_group', 'date_filter']),
            'relationshipOptions' => ClinicSetting::currentPatientRelationshipOptions(),
            'kpis' => $kpis,
        ]);
    }

    public function export(Request $request)
    {
        $user = $request->user();
        abort_unless($user && ($user->hasRole('Super Admin') || $user->can('patients.view')), 403);

        $query = Patient::query();

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('guardian_name')) {
            $query->where('guardian_name', 'like', '%'.trim($request->guardian_name).'%');
        }

        if ($request->filled('gender') && in_array($request->gender, ['male', 'female', 'other'], true)) {
            $query->where('gender', $request->gender);
        }

        if ($request->filled('blood_group')) {
            $query->where('blood_group', $request->blood_group);
        }

        if ($request->filled('date_filter')) {
            match ($request->date_filter) {
                'today' => $query->whereDate('created_at', now()->toDateString()),
                'this_week' => $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]),
                'this_month' => $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
                default => null,
            };
        }

        $patients = $query
            ->select([
                'id', 'patient_no', 'patient_series', 'patient_code', 'old_or_other_id',
                'name', 'guardian_name', 'guardian_relationship', 'guardian_relationship_custom',
                'gender', 'age_years', 'dob', 'phone', 'blood_group', 'address', 'created_at',
            ])
            ->latest()
            ->get();

        $filename = 'patients-export-'.now()->format('Y-m-d-His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($patients): void {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'Patient ID',
                'Old/Other ID',
                'Name',
                'Guardian (C/O)',
                'Gender',
                'Age (Years)',
                'Date of Birth',
                'Phone',
                'Blood Group',
                'Address',
                'Registered Date',
            ]);

            foreach ($patients as $p) {
                fputcsv($file, [
                    $p->patient_identifier ?? $p->patient_code ?? "{$p->patient_no}{$p->patient_series}",
                    $p->old_or_other_id ?? '',
                    $p->name,
                    $p->guardian_name ? "{$p->guardian_name} ({$p->guardian_relationship})" : '',
                    ucfirst((string) $p->gender),
                    $p->age_years ?? '',
                    $p->dob ? $p->dob->format('Y-m-d') : '',
                    $p->phone ?? '',
                    $p->blood_group ?? '',
                    $p->address ?? '',
                    $p->created_at ? $p->created_at->format('Y-m-d H:i') : '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
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

        $patients = Patient::select([
            'id', 'patient_no', 'patient_series', 'patient_code', 'patient_category',
            'old_or_other_id', 'name', 'guardian_name', 'guardian_relationship',
            'guardian_relationship_custom', 'age_years', 'age_months', 'age_days', 'gender',
        ])
            ->search($term)
            ->orderBy('name')
            ->limit(10)
            ->get();

        return response()->json($patients);
    }

    /**
     * Fetch longitudinal clinical history and attachments for patient consultation drawer.
     */
    public function clinicalHistory(Patient $patient, Request $request)
    {
        $user = $request->user();
        abort_unless($user && ($user->hasRole('Super Admin') || $user->can('clinical_records.view')), 403);

        $visits = $patient->visits()
            ->with([
                'doctor:id,name',
                'prescriptionItems.medicine:id,name',
                'prescriptionItems.pharmaceutical:id,brand_name,generic_name,strength,dosage_form',
            ])
            ->latest('visit_date')
            ->limit(15)
            ->get();

        $lastPrescription = null;
        $latestVisitWithRx = $visits->first(fn ($v) => $v->prescriptionItems->isNotEmpty());
        if ($latestVisitWithRx) {
            $lastPrescription = [
                'visit_id' => $latestVisitWithRx->id,
                'visit_date' => $latestVisitWithRx->visit_date,
                'doctor_name' => $latestVisitWithRx->doctor?->name,
                'items' => $latestVisitWithRx->prescriptionItems->map(fn ($item) => [
                    'item_type' => $item->item_type ?? ($item->pharmaceutical_id ? 'pharmaceutical' : 'remedy'),
                    'medicine_id' => $item->medicine_id,
                    'medicine_name' => $item->medicine?->name,
                    'pharmaceutical_id' => $item->pharmaceutical_id,
                    'brand_name' => $item->pharmaceutical?->brand_name,
                    'generic_name' => $item->pharmaceutical?->generic_name,
                    'strength' => $item->pharmaceutical?->strength,
                    'dosage_form' => $item->pharmaceutical?->dosage_form,
                    'timing' => $item->timing,
                    'before_after' => $item->before_after,
                    'dose_qty' => $item->dose_qty,
                    'dose_unit' => $item->dose_unit,
                    'dilution_note' => $item->dilution_note,
                    'duration_days' => $item->duration_days,
                ])->values()->all(),
            ];
        }

        $attachments = $patient->attachments()->limit(10)->get();

        return response()->json([
            'medical_history' => $patient->medical_history,
            'known_allergies' => $patient->known_allergies,
            'blood_group' => $patient->blood_group,
            'effective_last_visit_date' => $patient->effective_last_visit_date,
            'effective_visits_count' => $patient->effective_visits_count,
            'manual_last_visit_date' => $patient->manual_last_visit_date?->toDateString(),
            'legacy_visits_count' => $patient->legacy_visits_count,
            'today_queue_token' => $patient->todayQueueToken,
            'last_prescription' => $lastPrescription,
            'past_visits' => $visits,
            'attachments' => $attachments,
        ]);
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
        $oldOrOtherIdConfig = ClinicSetting::currentOldOrOtherIdConfig();
        $nextOldOrOtherIdPreview = Patient::generateNextOldOrOtherId(
            $oldOrOtherIdConfig['prefix'],
            $oldOrOtherIdConfig['number_padding']
        );
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
            'nextOldOrOtherIdPreview' => $nextOldOrOtherIdPreview,
            'oldOrOtherIdConfig' => array_merge($oldOrOtherIdConfig, [
                'preview' => $nextOldOrOtherIdPreview,
            ]),
            'fieldConfig' => $this->patientFormConfig($canViewClinicalRecords),
            'sectionConfig' => ClinicSetting::currentPatientFormSections(),
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

        $oldOrOtherIdConfig = ClinicSetting::currentOldOrOtherIdConfig();
        $oldOrOtherIdMode = $validated['old_or_other_id_mode'] ?? $oldOrOtherIdConfig['mode'];
        unset($validated['old_or_other_id_mode']);

        if ($oldOrOtherIdMode === 'auto' && empty($validated['old_or_other_id'])) {
            $validated['old_or_other_id'] = Patient::generateNextOldOrOtherId(
                $oldOrOtherIdConfig['prefix'],
                $oldOrOtherIdConfig['number_padding']
            );
        }

        $photoPath = $this->handlePatientPhoto($request);
        unset($validated['photo'], $validated['photo_webcam_data'], $validated['remove_photo']);
        $validated['photo_path'] = $photoPath;

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
            'old_or_other_id',
            'name',
            'reference_number',
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
            'manual_last_visit_date',
            'legacy_visits_count',
        ]);
        $patientDetails['patient_identifier'] = $patient->patient_identifier;
        $patientDetails['photo_path'] = $patient->photo_path;
        $patientDetails['photo_url'] = $patient->photo_url;
        $patientDetails['effective_last_visit_date'] = $patient->effective_last_visit_date;
        $patientDetails['effective_visits_count'] = $patient->effective_visits_count;
        $patientDetails['today_queue_token'] = $patient->todayQueueToken;

        if ($canViewClinicalRecords) {
            $patientDetails['blood_group'] = $patient->blood_group;
            $patientDetails['known_allergies'] = $patient->known_allergies;
            $patientDetails['medical_history'] = $patient->medical_history;
            $patientDetails['vitals_history'] = $patient->vitals()
                ->select([
                    'id', 'patient_id', 'visit_id', 'bp_systolic', 'bp_diastolic',
                    'pulse_rate', 'temperature_f', 'weight_kg', 'height_cm', 'bmi',
                    'blood_sugar_rbs', 'spo2', 'notes', 'created_at',
                ])
                ->limit(10)
                ->get();
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

        if ($user->can('attachments.view') || $canViewClinicalRecords) {
            $patientDetails['attachments'] = $patient->attachments()
                ->with('uploadedBy:id,name')
                ->latest()
                ->get()
                ->map(fn (PatientAttachment $attachment): array => [
                    'id' => $attachment->id,
                    'title' => $attachment->title,
                    'category' => $attachment->category,
                    'file_name' => $attachment->file_name,
                    'file_size_formatted' => $attachment->file_size_formatted,
                    'mime_type' => $attachment->mime_type,
                    'notes' => $attachment->notes,
                    'created_at' => $attachment->created_at?->format('d M Y, h:i A'),
                    'uploaded_by' => $attachment->uploadedBy?->name ?? 'System',
                    'view_url' => route('admin.attachments.show', $attachment),
                    'download_url' => route('admin.attachments.download', $attachment),
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
            'old_or_other_id',
            'name', 'reference_number', 'guardian_name', 'guardian_relationship', 'guardian_relationship_custom',
            'gender', 'age_years', 'age_months', 'age_days', 'dob', 'phone', 'address',
            'referred_by', 'created_at', 'manual_last_visit_date', 'legacy_visits_count',
        ]);

        if ($canViewClinicalRecords) {
            $patientDetails['blood_group'] = $patient->blood_group;
            $patientDetails['known_allergies'] = $patient->known_allergies;
            $patientDetails['medical_history'] = $patient->medical_history;
            $patientDetails['vitals_history'] = $patient->vitals()
                ->select([
                    'id', 'patient_id', 'visit_id', 'bp_systolic', 'bp_diastolic',
                    'pulse_rate', 'temperature_f', 'weight_kg', 'height_cm', 'bmi',
                    'blood_sugar_rbs', 'spo2', 'notes', 'created_at',
                ])
                ->limit(10)
                ->get();
        }

        $patientDetails['patient_identifier'] = $patient->patient_identifier;
        $patientDetails['photo_path'] = $patient->photo_path;
        $patientDetails['photo_url'] = $patient->photo_url;

        $oldOrOtherIdConfig = ClinicSetting::currentOldOrOtherIdConfig();
        $nextOldOrOtherIdPreview = Patient::generateNextOldOrOtherId(
            $oldOrOtherIdConfig['prefix'],
            $oldOrOtherIdConfig['number_padding']
        );

        return Inertia::render('Admin/Patients/Edit', [
            'patient' => $patientDetails,
            'nextOldOrOtherIdPreview' => $nextOldOrOtherIdPreview,
            'oldOrOtherIdConfig' => array_merge($oldOrOtherIdConfig, [
                'preview' => $nextOldOrOtherIdPreview,
            ]),
            'fieldConfig' => $this->patientFormConfig($canViewClinicalRecords),
            'sectionConfig' => ClinicSetting::currentPatientFormSections(),
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

        $photoPath = $this->handlePatientPhoto($request, $patient->photo_path);
        $validated['photo_path'] = $photoPath;
        unset($validated['photo'], $validated['photo_webcam_data'], $validated['remove_photo']);

        DB::transaction(function () use ($validated, $patient): void {
            $settings = ClinicSetting::query()->lockForUpdate()->first();
            $this->ensurePatientRelationshipIsAvailable($validated, $settings, $patient);
            $patient->update($validated);
        });

        return redirect()->route('admin.patients.index')->with('success', 'Patient updated successfully.');
    }

    public function destroy(Patient $patient)
    {
        if ($patient->photo_path && Storage::disk('public')->exists($patient->photo_path)) {
            Storage::disk('public')->delete($patient->photo_path);
        }

        foreach ($patient->attachments as $attachment) {
            if (Storage::disk('public')->exists($attachment->file_path)) {
                Storage::disk('public')->delete($attachment->file_path);
            }
        }

        $patient->delete();

        return redirect()->route('admin.patients.index')->with('success', 'Patient deleted successfully.');
    }

    /**
     * Serve patient clinical photo securely.
     */
    public function photo(Request $request, Patient $patient)
    {
        $user = $request->user();
        abort_unless($user instanceof User && ($user->can('patients.view') || $user->can('clinical_records.view')), 403);
        abort_unless(is_string($patient->photo_path) && $patient->photo_path !== '', 404);

        $disk = Storage::disk('public');
        abort_unless($disk->exists($patient->photo_path), 404);

        $mimeType = $disk->mimeType($patient->photo_path);
        abort_unless(in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true), 404);

        return $disk->response($patient->photo_path, basename($patient->photo_path), [
            'Cache-Control' => 'private, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    /**
     * Generate printable OPD / Patient ID Card with barcode.
     */
    public function opdCard(Request $request, Patient $patient, BarcodeService $barcodeService)
    {
        $user = $request->user();
        abort_unless($user instanceof User && ($user->hasRole('Super Admin') || $user->can('patients.view') || $user->can('clinical_records.view')), 403);

        $settings = ClinicSetting::query()->first();
        $barcodeText = $patient->patient_identifier ?: ('P-'.str_pad((string) $patient->id, 5, '0', STR_PAD_LEFT));
        $barcodeSvg = $barcodeService->generateCode128Svg($barcodeText, 48, 2, 8);

        $logoBase64 = null;
        if ($settings?->logo_path && Storage::disk('public')->exists($settings->logo_path)) {
            $logoContent = Storage::disk('public')->get($settings->logo_path);
            $mime = Storage::disk('public')->mimeType($settings->logo_path);
            $logoBase64 = 'data:'.$mime.';base64,'.base64_encode($logoContent);
        }

        $photoBase64 = null;
        if ($patient->photo_path && Storage::disk('public')->exists($patient->photo_path)) {
            $photoContent = Storage::disk('public')->get($patient->photo_path);
            $mime = Storage::disk('public')->mimeType($patient->photo_path);
            $photoBase64 = 'data:'.$mime.';base64,'.base64_encode($photoContent);
        }

        $dobFormatted = null;
        if ($patient->dob) {
            $dobFormatted = $patient->dob instanceof CarbonInterface
                ? $patient->dob->toDateString()
                : (string) $patient->dob;
        }

        $cardData = [
            'patient' => [
                'id' => $patient->id,
                'patient_identifier' => $patient->patient_identifier ?: $barcodeText,
                'patient_code' => $patient->patient_code,
                'name' => $patient->name,
                'gender' => $patient->gender,
                'age_years' => $patient->age_years,
                'age_months' => $patient->age_months,
                'dob' => $dobFormatted,
                'phone' => $patient->phone,
                'blood_group' => $patient->blood_group,
                'guardian_name' => $patient->guardian_name,
                'guardian_relationship' => $patient->guardian_relationship,
                'address' => $patient->address,
                'photo_url' => $patient->photo_url,
                'created_at' => $patient->created_at?->format('d M Y'),
            ],
            'clinic' => [
                'name' => $settings?->clinic_name_en ?? $settings?->clinic_name_bn ?? config('app.name', 'RemediQ'),
                'address' => $settings?->address ?? '',
                'phone' => $settings?->phone ?? '',
                'email' => $settings?->email ?? '',
                'logo_url' => $settings?->logo_path ? route('clinic.logo') : null,
            ],
            'barcodeSvg' => $barcodeSvg,
            'issuedAt' => now()->format('d M Y'),
        ];

        if ($request->query('format') === 'pdf') {
            $pdf = Pdf::loadView('pdf.opd_card', [
                ...$cardData,
                'barcodeBase64' => 'data:image/svg+xml;base64,'.base64_encode($barcodeSvg),
                'logoBase64' => $logoBase64,
                'photoBase64' => $photoBase64,
            ])->setPaper('a6', 'portrait');

            return $pdf->stream('opd-card-'.$patient->patient_identifier.'.pdf');
        }

        return Inertia::render('Admin/Patients/OpdCard', $cardData);
    }

    /**
     * Handle patient photo upload, webcam capture, or removal.
     */
    private function handlePatientPhoto(Request $request, ?string $currentPhotoPath = null): ?string
    {
        if ($request->boolean('remove_photo')) {
            if ($currentPhotoPath && Storage::disk('public')->exists($currentPhotoPath)) {
                Storage::disk('public')->delete($currentPhotoPath);
            }

            return null;
        }

        if ($request->hasFile('photo')) {
            if ($currentPhotoPath && Storage::disk('public')->exists($currentPhotoPath)) {
                Storage::disk('public')->delete($currentPhotoPath);
            }

            return $request->file('photo')->store('patients/photos', 'public');
        }

        if ($request->filled('photo_webcam_data')) {
            $data = (string) $request->input('photo_webcam_data');
            $extension = 'jpg';

            if (preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
                $data = substr($data, strpos($data, ',') + 1);
                $ext = strtolower($type[1]);
                if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                    $extension = ($ext === 'jpeg') ? 'jpg' : $ext;
                }
            }

            $decoded = base64_decode($data, true);
            if ($decoded !== false && strlen($decoded) > 0) {
                if ($currentPhotoPath && Storage::disk('public')->exists($currentPhotoPath)) {
                    Storage::disk('public')->delete($currentPhotoPath);
                }

                $fileName = 'patients/photos/patient_'.Str::random(32).'.'.$extension;
                Storage::disk('public')->put($fileName, $decoded);

                return $fileName;
            }
        }

        return $currentPhotoPath;
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
        $sections = collect(ClinicSetting::currentPatientFormSections())->keyBy('name');
        $fieldSections = ClinicSetting::patientFieldSections();

        foreach ($fieldConfig as $key => &$field) {
            $sectionName = $fieldSections[$key] ?? 'Identity';
            $section = $sections[$sectionName] ?? null;

            if ($section && ! $section['visible'] && ! in_array($key, ['name', 'gender'], true)) {
                $field['visible'] = false;
            }
        }
        unset($field);

        if (! $canViewClinicalRecords) {
            $fieldConfig['blood_group']['visible'] = false;
            $fieldConfig['known_allergies']['visible'] = false;
            $fieldConfig['medical_history']['visible'] = false;
        }

        return $fieldConfig;
    }
}
