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
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use App\Services\Admin\AppointmentRequestPatientMatcher;
use App\Services\Admin\ClinicalAccessAuditService;
use App\Services\BarcodeService;
use Barryvdh\DomPDF\Facade\Pdf;
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

        return Inertia::render('Admin/Patients/Index', [
            'patients' => $query
                ->select([
                    'id', 'patient_no', 'patient_series', 'patient_code', 'patient_category',
                    'old_or_other_id',
                    'name', 'reference_number', 'guardian_name', 'guardian_relationship', 'guardian_relationship_custom',
                    'gender', 'age_years', 'age_months', 'age_days', 'dob', 'phone', 'photo_path',
                ])
                ->latest()
                ->paginate(10)
                ->withQueryString(),
            'filters' => $request->only(['search', 'guardian_name']),
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
        ]);
        $patientDetails['patient_identifier'] = $patient->patient_identifier;
        $patientDetails['photo_path'] = $patient->photo_path;
        $patientDetails['photo_url'] = $patient->photo_url;
        $patientDetails['photo_path'] = $patient->photo_path;
        $patientDetails['photo_url'] = $patient->photo_url;

        if ($canViewClinicalRecords) {
            $patientDetails['blood_group'] = $patient->blood_group;
            $patientDetails['known_allergies'] = $patient->known_allergies;
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
            'referred_by', 'created_at',
        ]);

        if ($canViewClinicalRecords) {
            $patientDetails['blood_group'] = $patient->blood_group;
            $patientDetails['known_allergies'] = $patient->known_allergies;
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
        abort_unless($user instanceof User && ($user->can('patients.view') || $user->can('clinical_records.view')), 403);

        $settings = ClinicSetting::query()->first();
        $barcodeSvg = $barcodeService->generateCode128Svg($patient->patient_identifier, 48, 2, 8);

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

        $cardData = [
            'patient' => [
                'id' => $patient->id,
                'patient_identifier' => $patient->patient_identifier,
                'patient_code' => $patient->patient_code,
                'name' => $patient->name,
                'gender' => $patient->gender,
                'age_years' => $patient->age_years,
                'age_months' => $patient->age_months,
                'dob' => $patient->dob?->toDateString(),
                'phone' => $patient->phone,
                'blood_group' => $patient->blood_group,
                'guardian_name' => $patient->guardian_name,
                'guardian_relationship' => $patient->guardian_relationship,
                'address' => $patient->address,
                'photo_url' => $patient->photo_url,
                'created_at' => $patient->created_at?->format('d M Y'),
            ],
            'clinic' => [
                'name' => $settings?->clinic_name ?? config('app.name', 'RemediQ'),
                'address' => $settings?->address ?? '',
                'phone' => $settings?->phone ?? '',
                'email' => $settings?->email ?? '',
                'logo_url' => $settings?->logo_url ?? null,
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

        if (! $canViewClinicalRecords) {
            $fieldConfig['blood_group']['visible'] = false;
            $fieldConfig['known_allergies']['visible'] = false;
        }

        return $fieldConfig;
    }
}
