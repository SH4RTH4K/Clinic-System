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
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\Symptom;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitAmendment;
use App\Models\VisitDraft;
use App\Services\Admin\ClinicalAccessAuditService;
use App\Services\Admin\VisitAuthorizationService;
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
        if ($request->patient_id) {
            abort_unless($canViewPatients, 403);

            $patient = Patient::select('id', 'patient_no', 'patient_series', 'patient_code', 'patient_category', 'name', 'age_years', 'age_months', 'age_days', 'dob', 'gender')
                ->find($request->patient_id);
        }

        VisitDraft::where('expires_at', '<=', now())->delete();
        $hasSavedDraft = ! $patient && VisitDraft::where('user_id', $user->id)
            ->where('expires_at', '>', now())
            ->exists();

        $settings = ClinicSetting::first();
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        return Inertia::render('Admin/Visits/Create', [
            'patient' => $patient,
            'responsibleDoctor' => $responsibleDoctor?->only(['id', 'name', 'credentials']),
            'hasSavedDraft' => $hasSavedDraft,
            'draftOwnerToken' => VisitDraft::ownerTokenFor($user),
            'canFinalize' => $user->can('visits.finalize') && $responsibleDoctor !== null,
            'symptoms' => Symptom::where('is_active', true)->get(),
            'medicines' => Medicine::where('is_active', true)->get(),
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
        $visit = DB::transaction(function () use ($validated, $user, $visit): Visit {
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

            return $visit;
        });

        VisitDraft::where('user_id', $user->id)->delete();

        return redirect()
            ->route($visit->wasRecentlyCreated ? 'admin.visits.index' : 'admin.visits.show', $visit->wasRecentlyCreated ? [] : $visit->id)
            ->with('success', 'Visit finalized by the authorized prescriber.');
    }

    public function show(Request $request, Visit $visit)
    {
        $visit->load([
            'patient',
            'doctor',
            'finalizedBy:id,name',
            'amendments.amendedBy:id,name',
            'amendments.amendedByDoctor:id,name',
            'symptoms',
            'prescriptionItems.medicine',
            'adviceItems',
            'foodRestrictions',
        ]);

        $prescriptionHistory = $visit->prescriptionItems()
            ->withTrashed()
            ->with('medicine')
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

        $visit->load(['patient', 'doctor', 'symptoms', 'prescriptionItems', 'adviceItems', 'foodRestrictions']);

        $settings = ClinicSetting::first();
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        return Inertia::render('Admin/Visits/Edit', [
            'visit' => $visit,
            'canFinalize' => request()->user()->can('visits.finalize')
                && request()->user()->doctorProfile()->where('is_active', true)->exists(),
            'symptoms' => Symptom::where('is_active', true)->get(),
            'medicines' => Medicine::where('is_active', true)->get(),
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

        if (! isset($validated['prescription_items'])) {
            return;
        }

        $visit->prescriptionItems()->each(fn (PrescriptionItem $item) => $item->delete());

        $medicines = Medicine::query()
            ->whereIn('id', collect($validated['prescription_items'])->pluck('medicine_id'))
            ->get()
            ->keyBy('id');

        foreach ($validated['prescription_items'] as $index => $item) {
            $medicine = $medicines->get($item['medicine_id']);
            PrescriptionItem::create([
                'visit_id' => $visit->id,
                'prescription_version' => $prescriptionVersion,
                'medicine_id' => $item['medicine_id'],
                'sort_order' => $index,
                'timing' => $item['timing'],
                'before_after' => $item['before_after'],
                'dose_qty' => $item['dose_qty'],
                'dose_unit' => $item['dose_unit'],
                'dilution_note' => $item['dilution_note'] ?? 'with half a cup of water',
                'duration_days' => $item['duration_days'] ?? null,
                'prescription_snapshot' => $this->buildPrescriptionSnapshot($medicine, [
                    ...$item,
                    'dilution_note' => $item['dilution_note'] ?? 'with half a cup of water',
                    'duration_days' => $item['duration_days'] ?? null,
                ], $authorizerSnapshot),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $directions
     * @return array<string, mixed>
     */
    private function buildPrescriptionSnapshot(?Medicine $medicine, array $directions, ?array $authorizerSnapshot = null): array
    {
        return [
            'medicine_id' => $medicine?->id,
            'medicine_name' => $medicine?->name,
            'potency' => $medicine?->potency,
            'formulation' => $medicine?->form,
            'catalog_instruction' => $medicine?->default_instruction,
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
        $visit->prescriptionItems()->with('medicine')->get()->each(function (PrescriptionItem $item) use ($visit): void {
            $item->update([
                'prescription_snapshot' => $this->buildPrescriptionSnapshot($item->medicine, [
                    'timing' => $item->timing,
                    'before_after' => $item->before_after,
                    'dose_qty' => $item->dose_qty,
                    'dose_unit' => $item->dose_unit,
                    'dilution_note' => $item->dilution_note,
                    'duration_days' => $item->duration_days,
                ], $visit->prescription_authorizer_snapshot ?? $visit->prescriber_snapshot),
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
            'chief_complaint', 'bp_symptoms_notes', 'diagnosis_notes', 'follow_up_date',
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

        $prescriptionItems = $visit->prescriptionItems()->with('medicine')->get();

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

        $visit->load(['patient', 'doctor', 'symptoms', 'adviceItems', 'foodRestrictions']);
        $visit->setRelation('prescriptionItems', $prescriptionItems);
        $settings = ClinicSetting::first();
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        $pdf = Pdf::loadView('pdf.prescription', [
            'visit' => $visit,
            'settings' => $settings,
            'prescriptionConfig' => $prescriptionConfig,
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
