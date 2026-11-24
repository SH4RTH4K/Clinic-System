<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CancelPrescriptionRequest;
use App\Http\Requests\Admin\FinalizeVisitRequest;
use App\Http\Requests\Admin\StoreVisitRequest;
use App\Http\Requests\Admin\SymptomMedicineSuggestionRequest;
use App\Http\Requests\Admin\UpdateVisitRequest;
use App\Models\AdviceItem;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\FoodRestriction;
use App\Models\LabInvestigation;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Models\PatientVital;
use App\Models\Pharmaceutical;
use App\Models\PrescriptionItem;
use App\Models\Symptom;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitAmendment;
use App\Models\VisitDraft;
use App\Services\Admin\ClinicalAccessAuditService;
use App\Services\Admin\VisitAuthorizationService;
use App\Services\CommunicationService;
use App\Services\InventoryService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class VisitController extends Controller
{
    public function __construct(
        private VisitAuthorizationService $visitAuthorization,
        private ClinicalAccessAuditService $clinicalAccessAudit,
    ) {}

    public function index(Request $request)
    {
        $query = Visit::with(['patient', 'doctor'])->latest();

        return Inertia::render('Admin/Visits/Index', [
            'visits' => $query->paginate(10),
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $responsibleDoctor = $this->visitAuthorization->activeDoctor($user);
        $canViewPatients = $user->hasRole('Super Admin') || $user->can('patients.view');
        $patient = null;
        $initialPastVisits = [];
        $initialLastPrescription = null;

        if ($request->patient_id) {
            abort_unless($canViewPatients, 403);

            $selectColumns = [
                'id', 'patient_no', 'patient_series', 'patient_code', 'patient_category',
                'old_or_other_id', 'name', 'age_years', 'age_months', 'age_days', 'dob',
                'gender', 'phone', 'photo_path', 'manual_last_visit_date', 'legacy_visits_count',
            ];
            $canViewClinicalRecords = $user->hasRole('Super Admin') || $user->can('clinical_records.view');
            if ($canViewClinicalRecords) {
                $selectColumns[] = 'blood_group';
                $selectColumns[] = 'known_allergies';
                $selectColumns[] = 'medical_history';
            }

            $patient = Patient::select($selectColumns)->find($request->patient_id);

            if ($patient) {
                $patient->effective_last_visit_date = $patient->effective_last_visit_date;
                $patient->effective_visits_count = $patient->effective_visits_count;
                $patient->today_queue_token = $patient->todayQueueToken;
            }

            if ($patient && $canViewClinicalRecords) {
                $pastVisits = $patient->visits()
                    ->with([
                        'doctor:id,name',
                        'prescriptionItems.medicine:id,name',
                        'prescriptionItems.pharmaceutical:id,brand_name,generic_name,strength,dosage_form',
                    ])
                    ->latest('visit_date')
                    ->limit(10)
                    ->get();

                $initialPastVisits = $pastVisits;
                $latestVisitWithRx = $pastVisits->first(fn ($v) => $v->prescriptionItems->isNotEmpty());
                if ($latestVisitWithRx) {
                    $initialLastPrescription = [
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
            }
        }

        VisitDraft::where('expires_at', '<=', now())->delete();
        $hasSavedDraft = ! $patient && VisitDraft::where('user_id', $user->id)
            ->where('expires_at', '>', now())
            ->exists();

        $settings = ClinicSetting::first();
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();
        $practiceType = $settings->practice_type ?? 'homeopathy';

        return Inertia::render('Admin/Visits/Create', [
            'patient' => $patient,
            'initialPastVisits' => $initialPastVisits,
            'initialLastPrescription' => $initialLastPrescription,
            'responsibleDoctor' => $responsibleDoctor?->only(['id', 'name', 'credentials']),
            'hasSavedDraft' => $hasSavedDraft,
            'draftOwnerToken' => VisitDraft::ownerTokenFor($user),
            'canFinalize' => $user->can('visits.finalize') && $responsibleDoctor !== null,
            'symptoms' => Symptom::where('is_active', true)->get(),
            'medicines' => Medicine::where('is_active', true)->get(),
            'pharmaceuticals' => Pharmaceutical::where('is_active', true)->limit(50)->get(),
            'labInvestigations' => LabInvestigation::where('is_active', true)->get(),
            'practiceType' => $practiceType,
            'defaultAdvice' => AdviceItem::where('is_default', true)->get(),
            'defaultFood' => FoodRestriction::where('is_default', true)->get(),
            'prescriptionConfig' => $prescriptionConfig,
        ]);
    }

    public function store(StoreVisitRequest $request)
    {
        $validated = $request->validated();
        $user = $request->user();

        DB::transaction(function () use ($validated, $user): void {
            $doctor = $this->visitAuthorization->activeDoctor($user, true);
            $visit = Visit::create([
                'patient_id' => $validated['patient_id'],
                'doctor_id' => $doctor?->id,
                'visit_date' => $validated['visit_date'],
                'age_at_visit' => $validated['age_at_visit'] ?? null,
                'age_months' => $validated['age_months'] ?? null,
                'age_days' => $validated['age_days'] ?? null,
                'chief_complaint' => $validated['chief_complaint'],
                'bp_symptoms_notes' => $validated['bp_symptoms_notes'] ?? null,
                'diagnosis_notes' => $validated['diagnosis_notes'] ?? null,
                'provisional_diagnosis' => $validated['provisional_diagnosis'] ?? null,
                'final_diagnosis' => $validated['final_diagnosis'] ?? null,
                'physical_generals' => $validated['physical_generals'] ?? null,
                'follow_up_date' => $validated['follow_up_date'] ?? null,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            $this->syncMissingPatientDemographics($validated);
            $this->syncVisitRelations($visit, $validated);
        });

        VisitDraft::where('user_id', $request->user()->id)->delete();

        return redirect()->route('admin.visits.index')->with('success', 'Visit saved.');
    }

    public function finalize(FinalizeVisitRequest $request, ?Visit $visit = null)
    {
        $validated = $request->validated();
        $user = $request->user();
        $visit = DB::transaction(function () use ($validated, $user, $visit, $request): Visit {
            $doctor = $this->visitAuthorization->activeDoctor($user, true);
            abort_unless($doctor !== null, 403, 'Finalization requires an active linked Doctor profile.');

            if ($visit === null) {
                $finalizedAt = now();
                $visit = Visit::create([
                    'patient_id' => $validated['patient_id'],
                    'doctor_id' => $doctor->id,
                    'visit_date' => $validated['visit_date'],
                    'age_at_visit' => $validated['age_at_visit'] ?? null,
                    'age_months' => $validated['age_months'] ?? null,
                    'age_days' => $validated['age_days'] ?? null,
                    'chief_complaint' => $validated['chief_complaint'],
                    'bp_symptoms_notes' => $validated['bp_symptoms_notes'] ?? null,
                    'diagnosis_notes' => $validated['diagnosis_notes'] ?? null,
                    'provisional_diagnosis' => $validated['provisional_diagnosis'] ?? null,
                    'final_diagnosis' => $validated['final_diagnosis'] ?? null,
                    'physical_generals' => $validated['physical_generals'] ?? null,
                    'follow_up_date' => $validated['follow_up_date'] ?? null,
                    'status' => 'finalized',
                    'prescription_status' => 'finalized',
                    'created_by' => $user->id,
                    'finalized_by' => $user->id,
                    'finalized_at' => $finalizedAt,
                    'prescriber_snapshot' => $this->prescriberSnapshot($doctor, $user, $finalizedAt),
                    'prescription_authorizer_snapshot' => $this->prescriberSnapshot($doctor, $user, $finalizedAt),
                ]);

            } else {
                $visit = Visit::query()->lockForUpdate()->findOrFail($visit->id);

                abort_unless(
                    $this->visitAuthorization->canFinalizeDraft($user, $visit, $doctor),
                    403,
                    'Only the responsible Doctor can finalize this draft.',
                );

                $finalizedAt = now();
                $visit->update([
                    ...$this->validatedVisitAttributes($validated),
                    'status' => 'finalized',
                    'prescription_status' => 'finalized',
                    'finalized_by' => $user->id,
                    'finalized_at' => $finalizedAt,
                    'prescriber_snapshot' => $this->prescriberSnapshot($doctor, $user, $finalizedAt),
                    'prescription_authorizer_snapshot' => $this->prescriberSnapshot($doctor, $user, $finalizedAt),
                ]);
            }

            $this->syncMissingPatientDemographics($validated);
            $visit->update(['patient_snapshot' => $this->patientSnapshot($visit)]);
            $this->syncVisitRelations($visit, $validated);
            $this->snapshotActivePrescriptionItems($visit);

            $settings = ClinicSetting::query()->first();
            if ($settings?->auto_deduct_inventory) {
                app(InventoryService::class)->deductForPrescription($visit, $user);
            }

            if ($request->has('token_id')) {
                $token = PatientQueueToken::find($request->input('token_id'));
                if ($token) {
                    $token->update([
                        'visit_id' => $visit->id,
                        'status' => 'completed',
                        'completed_at' => now(),
                    ]);
                }
            }

            $smsConfig = $settings?->getSmsConfig() ?? ClinicSetting::defaultSmsConfig();
            if (! empty($smsConfig['sms_enabled']) && ! empty($smsConfig['auto_sms_prescriptions']) && $visit->patient?->phone) {
                try {
                    $template = $smsConfig['templates']['prescription_ready'] ?? 'Dear {patient_name}, your digital prescription is ready: {prescription_url}';
                    $msg = str_replace(
                        ['{patient_name}', '{doctor_name}', '{clinic_name}', '{prescription_url}'],
                        [$visit->patient->name, $doctor?->name ?? 'Doctor', $settings?->clinic_name_en ?? 'RemediQ Clinic', $visit->share_url],
                        $template
                    );
                    app(CommunicationService::class)->sendSms(
                        $visit->patient->phone,
                        $msg,
                        'prescription_ready',
                        $visit->patient_id,
                        $user
                    );
                } catch (\Throwable $e) {
                    // Fail-safe
                }
            }

            return $visit;
        });

        VisitDraft::where('user_id', $user->id)->delete();

        return redirect()
            ->route($visit->wasRecentlyCreated ? 'admin.visits.index' : 'admin.visits.show', $visit->wasRecentlyCreated ? [] : $visit->id)
            ->with('success', 'Visit finalized by the authorized prescriber.');
    }

    public function show(Request $request, Visit $visit)
    {
        $visit->ensureShareToken();

        $visit->load([
            'patient',
            'doctor',
            'finalizedBy:id,name',
            'amendments.amendedBy:id,name',
            'amendments.amendedByDoctor:id,name',
            'symptoms',
            'prescriptionItems.medicine',
            'prescriptionItems.pharmaceutical',
            'adviceItems',
            'foodRestrictions',
            'labInvestigations',
            'vital',
        ]);

        $prescriptionHistory = $visit->prescriptionItems()
            ->withTrashed()
            ->with(['medicine', 'pharmaceutical'])
            ->orderBy('prescription_version')
            ->orderBy('sort_order')
            ->get();

        $this->clinicalAccessAudit->visitDetailViewed($request, $request->user(), $visit);

        return Inertia::render('Admin/Visits/Show', [
            'visit' => $visit,
            'prescriptionHistory' => $prescriptionHistory,
            'canCancelPrescription' => $this->visitAuthorization->canCancelPrescription($request->user(), $visit),
        ]);
    }

    public function edit(Visit $visit)
    {
        $user = request()->user();
        abort_unless($user !== null && $this->visitAuthorization->canEdit($user, $visit), 403);

        $visit->load([
            'patient',
            'doctor',
            'symptoms',
            'prescriptionItems.medicine',
            'prescriptionItems.pharmaceutical',
            'adviceItems',
            'foodRestrictions',
            'labInvestigations',
            'vital',
        ]);

        $settings = ClinicSetting::first();
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();
        $practiceType = $settings->practice_type ?? 'homeopathy';

        return Inertia::render('Admin/Visits/Edit', [
            'visit' => $visit,
            'canFinalize' => request()->user()->can('visits.finalize')
                && request()->user()->doctorProfile()->where('is_active', true)->exists(),
            'symptoms' => Symptom::where('is_active', true)->get(),
            'medicines' => Medicine::where('is_active', true)->get(),
            'pharmaceuticals' => Pharmaceutical::where('is_active', true)->limit(50)->get(),
            'labInvestigations' => LabInvestigation::where('is_active', true)->get(),
            'practiceType' => $practiceType,
            'allAdvice' => AdviceItem::all(),
            'allFood' => FoodRestriction::all(),
            'prescriptionConfig' => $prescriptionConfig,
        ]);
    }

    public function update(UpdateVisitRequest $request, Visit $visit)
    {
        $validated = $request->validated();
        $isAmendment = $visit->status === 'finalized';
        $amendmentReason = $validated['amendment_reason'] ?? null;
        $changedFields = $isAmendment ? $this->changedVisitFields($visit, $validated) : [];
        unset($validated['amendment_reason']);

        $user = $request->user();
        $prescriptionAuthorizer = null;

        DB::transaction(function () use ($validated, $visit, $user, $isAmendment, $amendmentReason, $changedFields, $prescriptionAuthorizer): void {
            $visit = Visit::query()->lockForUpdate()->findOrFail($visit->id);
            $doctor = $this->visitAuthorization->activeDoctor($user, true);
            abort_unless(
                $visit->status === ($isAmendment ? 'finalized' : 'draft')
                    && $this->visitAuthorization->canEditWithDoctor($user, $visit, $doctor),
                403,
                'This visit changed state before the update could be saved.',
            );

            if ($isAmendment && in_array('prescription_items', $changedFields, true)) {
                abort_unless($doctor !== null, 403, 'Prescription amendments require an active linked prescriber profile.');
                $prescriptionAuthorizer = $this->prescriberSnapshot($doctor, $user, now());
            }

            $prescriptionVersion = $isAmendment
                ? (int) $visit->prescriptionItems()->withTrashed()->max('prescription_version')
                    + (in_array('prescription_items', $changedFields, true) ? 1 : 0)
                : 1;

            $visit->update([
                ...$this->validatedVisitAttributes($validated),
                'status' => $visit->status,
                'prescription_status' => $isAmendment && in_array('prescription_items', $changedFields, true)
                    ? 'amended'
                    : $visit->prescription_status,
                'prescription_authorizer_snapshot' => $prescriptionAuthorizer ?? $visit->prescription_authorizer_snapshot,
            ]);

            $relationUpdates = $validated;

            if ($isAmendment && ! in_array('prescription_items', $changedFields, true)) {
                unset($relationUpdates['prescription_items']);
            }

            $this->syncVisitRelations($visit, $relationUpdates, $prescriptionVersion, $prescriptionAuthorizer);

            if ($isAmendment) {
                VisitAmendment::create([
                    'visit_id' => $visit->id,
                    'amended_by' => $user->id,
                    'reason' => $amendmentReason,
                    'changed_fields' => $changedFields,
                ]);
            }
        });

        return redirect()->route('admin.visits.show', $visit->id)
            ->with('success', $isAmendment ? 'Visit amendment recorded.' : 'Visit updated.');
    }

    public function destroy(Visit $visit)
    {
        $user = request()->user();
        abort_unless($user !== null, 403);

        DB::transaction(function () use ($visit, $user): void {
            $visit = Visit::query()->lockForUpdate()->findOrFail($visit->id);
            $doctor = $this->visitAuthorization->activeDoctor($user, true);
            abort_unless($this->visitAuthorization->canDeleteDraft($user, $visit, $doctor), 403);

            $visit->delete();
        });

        return redirect()->route('admin.visits.index')->with('success', 'Visit deleted.');
    }

    public function cancelPrescription(CancelPrescriptionRequest $request, Visit $visit)
    {
        $user = $request->user();
        $reason = $request->validated('reason');

        DB::transaction(function () use ($visit, $user, $reason): void {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            abort_unless($user->is_active, 403, 'Active accounts are required to cancel prescriptions.');

            $visit = Visit::query()->lockForUpdate()->findOrFail($visit->id);
            $doctor = $this->visitAuthorization->activeDoctor($user, true);
            abort_unless(
                $this->visitAuthorization->canCancelPrescriptionWithDoctor($user, $visit, $doctor),
                403,
                'You are not authorized to cancel this prescription.',
            );

            $cancelledAt = now();

            $visit->update([
                'prescription_status' => 'cancelled',
                'cancelled_by' => $user->id,
                'cancelled_at' => $cancelledAt,
            ]);

            VisitAmendment::create([
                'visit_id' => $visit->id,
                'amended_by' => $user->id,
                'amended_by_doctor_id' => $doctor->id,
                'reason' => $reason,
                'changed_fields' => ['prescription_status'],
            ]);
        });

        return redirect()->route('admin.visits.show', $visit->id)->with('success', 'Prescription cancelled and recorded.');
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function validatedVisitAttributes(array $validated): array
    {
        return [
            'patient_id' => $validated['patient_id'],
            'visit_date' => $validated['visit_date'],
            'age_at_visit' => $validated['age_at_visit'] ?? null,
            'age_months' => $validated['age_months'] ?? null,
            'age_days' => $validated['age_days'] ?? null,
            'chief_complaint' => $validated['chief_complaint'],
            'bp_symptoms_notes' => $validated['bp_symptoms_notes'] ?? null,
            'diagnosis_notes' => $validated['diagnosis_notes'] ?? null,
            'provisional_diagnosis' => $validated['provisional_diagnosis'] ?? null,
            'final_diagnosis' => $validated['final_diagnosis'] ?? null,
            'physical_generals' => $validated['physical_generals'] ?? null,
            'follow_up_date' => $validated['follow_up_date'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncMissingPatientDemographics(array $validated): void
    {
        $patient = Patient::find($validated['patient_id']);

        if ($patient === null) {
            return;
        }

        $patientUpdates = [];

        if (! empty($validated['patient_dob']) && empty($patient->dob)) {
            $patientUpdates['dob'] = $validated['patient_dob'];
        }

        foreach (['age_at_visit' => 'age_years', 'age_months' => 'age_months', 'age_days' => 'age_days'] as $input => $attribute) {
            if (isset($validated[$input]) && is_null($patient->{$attribute})) {
                $patientUpdates[$attribute] = $validated[$input];
            }
        }

        if ($patientUpdates !== []) {
            $patient->update($patientUpdates);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncVisitRelations(Visit $visit, array $validated, int $prescriptionVersion = 1, ?array $authorizerSnapshot = null): void
    {
        foreach ([
            'symptoms' => 'symptoms',
            'advice_items' => 'adviceItems',
            'food_restrictions' => 'foodRestrictions',
        ] as $input => $relation) {
            if (isset($validated[$input])) {
                $visit->{$relation}()->sync($validated[$input]);
            }
        }

        if (array_key_exists('lab_investigations', $validated)) {
            $visit->labInvestigations()->delete();
            foreach ($validated['lab_investigations'] as $lab) {
                if (! empty($lab['test_name'])) {
                    $visit->labInvestigations()->create([
                        'lab_investigation_id' => $lab['lab_investigation_id'] ?? null,
                        'test_name' => $lab['test_name'],
                        'instructions' => $lab['instructions'] ?? null,
                        'status' => $lab['status'] ?? 'ordered',
                    ]);
                }
            }
        }

        if (array_key_exists('vitals', $validated) && is_array($validated['vitals'])) {
            $vitalsData = $validated['vitals'];
            $hasAnyVital = collect($vitalsData)->filter(fn ($v) => $v !== null && $v !== '')->isNotEmpty();
            if ($hasAnyVital) {
                $height = isset($vitalsData['height_cm']) && is_numeric($vitalsData['height_cm']) ? (float) $vitalsData['height_cm'] : null;
                $weight = isset($vitalsData['weight_kg']) && is_numeric($vitalsData['weight_kg']) ? (float) $vitalsData['weight_kg'] : null;
                $bmi = isset($vitalsData['bmi']) && is_numeric($vitalsData['bmi'])
                    ? (float) $vitalsData['bmi']
                    : PatientVital::calculateBmi($weight, $height);

                PatientVital::updateOrCreate(
                    ['visit_id' => $visit->id],
                    [
                        'patient_id' => $visit->patient_id,
                        'bp_systolic' => ! empty($vitalsData['bp_systolic']) ? (int) $vitalsData['bp_systolic'] : null,
                        'bp_diastolic' => ! empty($vitalsData['bp_diastolic']) ? (int) $vitalsData['bp_diastolic'] : null,
                        'pulse_rate' => ! empty($vitalsData['pulse_rate']) ? (int) $vitalsData['pulse_rate'] : null,
                        'temperature_f' => isset($vitalsData['temperature_f']) && is_numeric($vitalsData['temperature_f']) ? (float) $vitalsData['temperature_f'] : null,
                        'respiratory_rate' => ! empty($vitalsData['respiratory_rate']) ? (int) $vitalsData['respiratory_rate'] : null,
                        'spo2' => ! empty($vitalsData['spo2']) ? (int) $vitalsData['spo2'] : null,
                        'weight_kg' => $weight,
                        'height_cm' => $height,
                        'bmi' => $bmi,
                        'blood_sugar_rbs' => isset($vitalsData['blood_sugar_rbs']) && is_numeric($vitalsData['blood_sugar_rbs']) ? (float) $vitalsData['blood_sugar_rbs'] : null,
                        'blood_sugar_fbs' => isset($vitalsData['blood_sugar_fbs']) && is_numeric($vitalsData['blood_sugar_fbs']) ? (float) $vitalsData['blood_sugar_fbs'] : null,
                        'notes' => $vitalsData['notes'] ?? null,
                        'recorded_by' => auth()->id() ?? $visit->created_by,
                    ]
                );
            }
        }

        if (! isset($validated['prescription_items'])) {
            return;
        }

        $visit->prescriptionItems()->each(fn (PrescriptionItem $item) => $item->delete());

        $medicineIds = collect($validated['prescription_items'])
            ->pluck('medicine_id')
            ->filter();
        $medicines = Medicine::query()
            ->whereIn('id', $medicineIds)
            ->get()
            ->keyBy('id');

        $pharmaceuticalIds = collect($validated['prescription_items'])
            ->pluck('pharmaceutical_id')
            ->filter();
        $pharmaceuticals = Pharmaceutical::query()
            ->whereIn('id', $pharmaceuticalIds)
            ->get()
            ->keyBy('id');

        foreach ($validated['prescription_items'] as $index => $item) {
            $isPharma = ($item['item_type'] ?? '') === 'pharmaceutical' || ! empty($item['pharmaceutical_id']) || ! empty($item['brand_name']);
            $medicine = ! empty($item['medicine_id']) ? $medicines->get($item['medicine_id']) : null;
            $pharma = ! empty($item['pharmaceutical_id']) ? $pharmaceuticals->get($item['pharmaceutical_id']) : null;

            $brandName = $item['brand_name'] ?? $pharma?->brand_name;
            $genericName = $item['generic_name'] ?? $pharma?->generic_name;
            $strength = $item['strength'] ?? $pharma?->strength;
            $dosageForm = $item['dosage_form'] ?? $pharma?->dosage_form;

            PrescriptionItem::create([
                'visit_id' => $visit->id,
                'prescription_version' => $prescriptionVersion,
                'item_type' => $isPharma ? 'pharmaceutical' : 'remedy',
                'medicine_id' => $isPharma ? null : ($item['medicine_id'] ?? null),
                'pharmaceutical_id' => $pharma?->id ?? ($item['pharmaceutical_id'] ?? null),
                'brand_name' => $brandName,
                'generic_name' => $genericName,
                'strength' => $strength,
                'dosage_form' => $dosageForm,
                'sort_order' => $index,
                'timing' => $item['timing'],
                'before_after' => $item['before_after'],
                'dose_qty' => $item['dose_qty'],
                'dose_unit' => $item['dose_unit'],
                'dilution_note' => $item['dilution_note'] ?? 'with half a cup of water',
                'duration_days' => $item['duration_days'] ?? null,
                'prescription_snapshot' => $this->buildPrescriptionSnapshot($medicine, [
                    ...$item,
                    'item_type' => $isPharma ? 'pharmaceutical' : 'remedy',
                    'brand_name' => $brandName,
                    'generic_name' => $genericName,
                    'strength' => $strength,
                    'dosage_form' => $dosageForm,
                    'dilution_note' => $item['dilution_note'] ?? 'with half a cup of water',
                    'duration_days' => $item['duration_days'] ?? null,
                ], $authorizerSnapshot, $pharma),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $directions
     * @return array<string, mixed>
     */
    private function buildPrescriptionSnapshot(
        ?Medicine $medicine,
        array $directions,
        ?array $authorizerSnapshot = null,
        ?Pharmaceutical $pharma = null
    ): array {
        $isPharma = ($directions['item_type'] ?? '') === 'pharmaceutical' || $pharma !== null || ! empty($directions['brand_name']);

        return [
            'item_type' => $isPharma ? 'pharmaceutical' : 'remedy',
            'medicine_id' => $medicine?->id,
            'medicine_name' => $medicine?->name,
            'potency' => $medicine?->potency,
            'formulation' => $medicine?->form,
            'catalog_instruction' => $medicine?->default_instruction,
            'pharmaceutical_id' => $pharma?->id ?? ($directions['pharmaceutical_id'] ?? null),
            'brand_name' => $directions['brand_name'] ?? $pharma?->brand_name,
            'generic_name' => $directions['generic_name'] ?? $pharma?->generic_name,
            'strength' => $directions['strength'] ?? $pharma?->strength,
            'dosage_form' => $directions['dosage_form'] ?? $pharma?->dosage_form,
            'authorizer' => $authorizerSnapshot,
            'provenance' => [
                'kind' => 'prescriber_authorized_capture',
                'status' => 'captured_at_authorization',
                'captured_at' => now()->toISOString(),
            ],
            'directions' => [
                'timing' => $directions['timing'] ?? [],
                'before_after' => $directions['before_after'] ?? null,
                'dose_qty' => $directions['dose_qty'] ?? null,
                'dose_unit' => $directions['dose_unit'] ?? null,
                'dilution_note' => $directions['dilution_note'] ?? null,
                'duration_days' => $directions['duration_days'] ?? null,
            ],
        ];
    }

    private function snapshotActivePrescriptionItems(Visit $visit): void
    {
        $visit->prescriptionItems()->with(['medicine', 'pharmaceutical'])->get()->each(function (PrescriptionItem $item) use ($visit): void {
            $item->update([
                'prescription_snapshot' => $this->buildPrescriptionSnapshot($item->medicine, [
                    'item_type' => $item->item_type,
                    'brand_name' => $item->brand_name,
                    'generic_name' => $item->generic_name,
                    'strength' => $item->strength,
                    'dosage_form' => $item->dosage_form,
                    'timing' => $item->timing,
                    'before_after' => $item->before_after,
                    'dose_qty' => $item->dose_qty,
                    'dose_unit' => $item->dose_unit,
                    'dilution_note' => $item->dilution_note,
                    'duration_days' => $item->duration_days,
                ], $visit->prescription_authorizer_snapshot ?? $visit->prescriber_snapshot, $item->pharmaceutical),
            ]);
        });
    }

    /**
     * @return array<string, int|string|null>
     */
    private function prescriberSnapshot(Doctor $doctor, User $user, Carbon $finalizedAt): array
    {
        return [
            'doctor_id' => $doctor->id,
            'doctor_name' => $doctor->name,
            'credentials' => $doctor->credentials,
            'registration_number' => $doctor->govt_reg_no,
            'authorized_by_user_id' => $user->id,
            'authorized_by_name' => $user->name,
            'authorized_at' => $finalizedAt->toISOString(),
        ];
    }

    /**
     * @return array<string, int|string|null>
     */
    private function patientSnapshot(Visit $visit): array
    {
        $patient = $visit->patient()->firstOrFail();

        return [
            'patient_id' => $patient->id,
            'patient_identifier' => $patient->patient_identifier,
            'old_or_other_id' => $patient->old_or_other_id,
            'name' => $patient->name,
            'gender' => $patient->gender,
            'phone' => $patient->phone,
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<int, string>
     */
    private function changedVisitFields(Visit $visit, array $validated): array
    {
        $changedFields = [];

        foreach ([
            'patient_id', 'visit_date', 'age_at_visit', 'age_months', 'age_days',
            'chief_complaint', 'bp_symptoms_notes', 'diagnosis_notes', 'provisional_diagnosis', 'final_diagnosis', 'physical_generals', 'follow_up_date',
        ] as $field) {
            $before = $visit->{$field};
            $after = $validated[$field] ?? null;

            if ($before instanceof \DateTimeInterface) {
                $before = $before->format('Y-m-d');
            }

            if ((string) ($before ?? '') !== (string) ($after ?? '')) {
                $changedFields[] = $field;
            }
        }

        foreach ([
            'symptoms' => 'symptoms',
            'advice_items' => 'adviceItems',
            'food_restrictions' => 'foodRestrictions',
        ] as $input => $relation) {
            if (! array_key_exists($input, $validated)) {
                continue;
            }

            $before = $visit->{$relation}()->get()->modelKeys();
            $before = array_map('intval', $before);
            sort($before);
            $after = collect($validated[$input])->map(fn ($id) => (int) $id)->sort()->values()->all();

            if ($before !== $after) {
                $changedFields[] = $input;
            }
        }

        if (array_key_exists('prescription_items', $validated)) {
            $before = $visit->prescriptionItems()->orderBy('sort_order')->get()->map(fn (PrescriptionItem $item) => [
                'medicine_id' => (int) $item->medicine_id,
                'timing' => $item->timing ?? [],
                'before_after' => $item->before_after,
                'dose_qty' => (string) $item->dose_qty,
                'dose_unit' => $item->dose_unit,
                'dilution_note' => $item->dilution_note,
                'duration_days' => $item->duration_days === null ? null : (int) $item->duration_days,
            ])->values()->all();
            $after = collect($validated['prescription_items'])->map(fn (array $item) => [
                'medicine_id' => (int) $item['medicine_id'],
                'timing' => $item['timing'],
                'before_after' => $item['before_after'],
                'dose_qty' => (string) $item['dose_qty'],
                'dose_unit' => $item['dose_unit'],
                'dilution_note' => $item['dilution_note'] ?? 'with half a cup of water',
                'duration_days' => isset($item['duration_days']) ? (int) $item['duration_days'] : null,
            ])->values()->all();

            if ($before !== $after) {
                $changedFields[] = 'prescription_items';
            }
        }

        return array_values(array_unique($changedFields));
    }

    public function suggestions(SymptomMedicineSuggestionRequest $request)
    {
        $symptomIds = $request->validated('symptoms');
        if (empty($symptomIds)) {
            return response()->json([]);
        }
        $suggestions = DB::table('symptom_medicine_map')
            ->join('symptoms', 'symptoms.id', '=', 'symptom_medicine_map.symptom_id')
            ->join('medicines', 'medicines.id', '=', 'symptom_medicine_map.medicine_id')
            ->select('symptom_medicine_map.medicine_id', DB::raw('COUNT(DISTINCT symptom_medicine_map.symptom_id) AS reference_match_count'), DB::raw('MIN(symptom_medicine_map.priority) AS best_priority'))
            ->whereIn('symptom_medicine_map.symptom_id', $symptomIds)
            ->where('symptom_medicine_map.review_status', 'approved')
            ->where('symptom_medicine_map.is_approved', true)
            ->whereNull('symptom_medicine_map.deleted_at')
            ->where('symptoms.is_active', true)
            ->where('medicines.is_active', true)
            ->groupBy('symptom_medicine_map.medicine_id')
            ->orderByDesc('reference_match_count')
            ->orderBy('best_priority')
            ->limit(10)
            ->get();

        $medicineIds = $suggestions->pluck('medicine_id');
        $medicines = Medicine::whereIn('id', $medicineIds)->where('is_active', true)->get()->keyBy('id');

        return response()->json($suggestions->map(fn ($suggestion): array => [
            'medicine_id' => $suggestion->medicine_id,
            'medicine_name' => $medicines[$suggestion->medicine_id]->name,
            'reference_match_count' => (int) $suggestion->reference_match_count,
            'best_priority' => (int) $suggestion->best_priority,
        ])->values());
    }

    public function pdf(Visit $visit)
    {
        $user = request()->user();

        abort_unless($user instanceof User, 403);

        if (! $user->can('clinical_records.view')
            || ! ($user->hasRole('Super Admin') || $user->can('patients.view'))) {
            $this->clinicalAccessAudit->clinicalAccessDenied(
                request(),
                $user,
                'patients.view',
                (int) $visit->id,
                (int) $visit->patient_id,
            );

            abort(403);
        }
        if ($visit->status !== 'finalized'
            || ! in_array($visit->prescription_status, ['finalized', 'amended'], true)) {
            $this->clinicalAccessAudit->clinicalAccessDenied(
                request(),
                $user,
                'visits.export',
                (int) $visit->id,
                (int) $visit->patient_id,
                'prescription_not_issuable',
            );

            abort(403, 'Only active, finalized prescriptions can be issued.');
        }

        $prescriptionItems = $visit->prescriptionItems()->with(['medicine', 'pharmaceutical'])->get();

        if (! $prescriptionItems->every(fn (PrescriptionItem $item): bool => $this->hasAuthorizedSnapshot($item))) {
            $this->clinicalAccessAudit->clinicalAccessDenied(
                request(),
                $user,
                'visits.export',
                (int) $visit->id,
                (int) $visit->patient_id,
                'unverified_prescription_snapshot',
            );

            abort(403, 'Prescription history without verified capture provenance requires clinical review before issuing.');
        }

        $visit->load(['patient', 'doctor', 'symptoms', 'adviceItems', 'foodRestrictions', 'labInvestigations', 'vital']);
        $visit->setRelation('prescriptionItems', $prescriptionItems);
        $settings = ClinicSetting::first();
        $practiceType = $settings->practice_type ?? 'homeopathy';
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        $isPrePrinted = request()->boolean('pre_printed');

        $logoBase64 = null;
        if (! empty($settings?->logo_path) && Storage::disk('public')->exists($settings->logo_path)) {
            $logoContent = Storage::disk('public')->get($settings->logo_path);
            $mime = Storage::disk('public')->mimeType($settings->logo_path);
            $logoBase64 = 'data:'.$mime.';base64,'.base64_encode($logoContent);
        }

        $signatureBase64 = null;
        if (! empty($visit->doctor?->signature_path) && Storage::disk('public')->exists($visit->doctor->signature_path)) {
            $sigContent = Storage::disk('public')->get($visit->doctor->signature_path);
            $mime = Storage::disk('public')->mimeType($visit->doctor->signature_path);
            $signatureBase64 = 'data:'.$mime.';base64,'.base64_encode($sigContent);
        }

        $sealBase64 = null;
        if (! empty($visit->doctor?->seal_path) && Storage::disk('public')->exists($visit->doctor->seal_path)) {
            $sealContent = Storage::disk('public')->get($visit->doctor->seal_path);
            $mime = Storage::disk('public')->mimeType($visit->doctor->seal_path);
            $sealBase64 = 'data:'.$mime.';base64,'.base64_encode($sealContent);
        }

        $pdf = Pdf::loadView('pdf.prescription', [
            'visit' => $visit,
            'vital' => $visit->vital,
            'settings' => $settings,
            'practiceType' => $practiceType,
            'prescriptionConfig' => $prescriptionConfig,
            'isPrePrinted' => $isPrePrinted,
            'logoBase64' => $logoBase64,
            'signatureBase64' => $signatureBase64,
            'sealBase64' => $sealBase64,
        ]);

        $response = $pdf->stream('prescription-'.$visit->id.'.pdf');
        $this->clinicalAccessAudit->prescriptionPdfExported(request(), $user, $visit);

        return $response;
    }

    private function hasAuthorizedSnapshot(PrescriptionItem $item): bool
    {
        $snapshot = $item->prescription_snapshot;

        if (! is_array($snapshot)) {
            return false;
        }

        $provenance = $snapshot['provenance'] ?? null;
        $authorizer = $snapshot['authorizer'] ?? null;

        return is_array($provenance)
            && ($provenance['kind'] ?? null) === 'prescriber_authorized_capture'
            && ($provenance['status'] ?? null) === 'captured_at_authorization'
            && is_array($snapshot['directions'] ?? null)
            && is_array($authorizer)
            && filled($authorizer['authorized_by_user_id'] ?? null)
            && filled($authorizer['authorized_at'] ?? null);
    }
}
