<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreVisitRequest;
use App\Http\Requests\Admin\UpdateVisitRequest;
use App\Models\AdviceItem;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\FoodRestriction;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\Symptom;
use App\Models\Visit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class VisitController extends Controller
{
    public function index(Request $request)
    {
        $query = Visit::with(['patient', 'doctor'])->latest();

        return Inertia::render('Admin/Visits/Index', [
            'visits' => $query->paginate(10),
        ]);
    }

    public function create(Request $request)
    {
        $patient = null;
        if ($request->patient_id) {
            $patient = Patient::select('id', 'patient_no', 'patient_series', 'name', 'age_years', 'age_months', 'age_days', 'dob', 'gender')
                ->find($request->patient_id);
        }

        $settings = ClinicSetting::first();
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        return Inertia::render('Admin/Visits/Create', [
            'patient' => $patient,
            'doctors' => Doctor::where('is_active', true)->select('id', 'name', 'credentials')->orderBy('sort_order')->get(),
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

        DB::transaction(function () use ($validated) {
            $visit = Visit::create([
                'patient_id' => $validated['patient_id'],
                'doctor_id' => $validated['doctor_id'] ?? null,
                'visit_date' => $validated['visit_date'],
                'age_at_visit' => $validated['age_at_visit'] ?? null,
                'age_months' => $validated['age_months'] ?? null,
                'age_days' => $validated['age_days'] ?? null,
                'chief_complaint' => $validated['chief_complaint'],
                'bp_symptoms_notes' => $validated['bp_symptoms_notes'] ?? null,
                'diagnosis_notes' => $validated['diagnosis_notes'] ?? null,
                'follow_up_date' => $validated['follow_up_date'] ?? null,
                'status' => $validated['status'],
                'created_by' => Auth::id(),
            ]);

            // Sync missing demographics to patient record if provided
            $patient = Patient::find($validated['patient_id']);
            if ($patient) {
                $patientUpdates = [];
                if (! empty($validated['patient_dob']) && empty($patient->dob)) {
                    $patientUpdates['dob'] = $validated['patient_dob'];
                }
                if (isset($validated['age_at_visit']) && is_null($patient->age_years)) {
                    $patientUpdates['age_years'] = $validated['age_at_visit'];
                }
                if (isset($validated['age_months']) && is_null($patient->age_months)) {
                    $patientUpdates['age_months'] = $validated['age_months'];
                }
                if (isset($validated['age_days']) && is_null($patient->age_days)) {
                    $patientUpdates['age_days'] = $validated['age_days'];
                }
                if (! empty($patientUpdates)) {
                    $patient->update($patientUpdates);
                }
            }

            if (! empty($validated['symptoms'])) {
                $visit->symptoms()->sync($validated['symptoms']);
            }

            if (! empty($validated['advice_items'])) {
                $visit->adviceItems()->sync($validated['advice_items']);
            }

            if (! empty($validated['food_restrictions'])) {
                $visit->foodRestrictions()->sync($validated['food_restrictions']);
            }

            if (! empty($validated['prescription_items'])) {
                foreach ($validated['prescription_items'] as $index => $item) {
                    PrescriptionItem::create([
                        'visit_id' => $visit->id,
                        'medicine_id' => $item['medicine_id'],
                        'sort_order' => $index,
                        'timing' => $item['timing'],
                        'before_after' => $item['before_after'],
                        'dose_qty' => $item['dose_qty'],
                        'dose_unit' => $item['dose_unit'],
                        'dilution_note' => $item['dilution_note'] ?? 'with half a cup of water',
                        'duration_days' => $item['duration_days'] ?? null,
                    ]);
                }
            }
        });

        return redirect()->route('admin.visits.index')->with('success', 'Visit saved.');
    }

    public function show(Visit $visit)
    {
        $visit->load(['patient', 'doctor', 'symptoms', 'prescriptionItems.medicine', 'adviceItems', 'foodRestrictions']);

        return Inertia::render('Admin/Visits/Show', ['visit' => $visit]);
    }

    public function edit(Visit $visit)
    {
        $visit->load(['patient', 'doctor', 'symptoms', 'prescriptionItems', 'adviceItems', 'foodRestrictions']);

        $settings = ClinicSetting::first();
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        return Inertia::render('Admin/Visits/Edit', [
            'visit' => $visit,
            'doctors' => Doctor::where('is_active', true)->select('id', 'name', 'credentials')->orderBy('sort_order')->get(),
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

        DB::transaction(function () use ($validated, $visit) {
            $visit->update([
                'patient_id' => $validated['patient_id'],
                'doctor_id' => $validated['doctor_id'] ?? null,
                'visit_date' => $validated['visit_date'],
                'age_at_visit' => $validated['age_at_visit'] ?? null,
                'age_months' => $validated['age_months'] ?? null,
                'age_days' => $validated['age_days'] ?? null,
                'chief_complaint' => $validated['chief_complaint'],
                'bp_symptoms_notes' => $validated['bp_symptoms_notes'] ?? null,
                'diagnosis_notes' => $validated['diagnosis_notes'] ?? null,
                'follow_up_date' => $validated['follow_up_date'] ?? null,
                'status' => $validated['status'],
            ]);

            if (isset($validated['symptoms'])) {
                $visit->symptoms()->sync($validated['symptoms']);
            }

            if (isset($validated['advice_items'])) {
                $visit->adviceItems()->sync($validated['advice_items']);
            }

            if (isset($validated['food_restrictions'])) {
                $visit->foodRestrictions()->sync($validated['food_restrictions']);
            }

            if (isset($validated['prescription_items'])) {
                // Use each() so SoftDeletes model events fire on every item
                $visit->prescriptionItems()->each(fn ($item) => $item->delete());

                foreach ($validated['prescription_items'] as $index => $item) {
                    PrescriptionItem::create([
                        'visit_id' => $visit->id,
                        'medicine_id' => $item['medicine_id'],
                        'sort_order' => $index,
                        'timing' => $item['timing'],
                        'before_after' => $item['before_after'],
                        'dose_qty' => $item['dose_qty'],
                        'dose_unit' => $item['dose_unit'],
                        'dilution_note' => $item['dilution_note'] ?? 'with half a cup of water',
                        'duration_days' => $item['duration_days'] ?? null,
                    ]);
                }
            }
        });

        return redirect()->route('admin.visits.show', $visit->id)->with('success', 'Visit updated.');
    }

    public function destroy(Visit $visit)
    {
        if ($visit->status === 'finalized') {
            abort(403, 'Finalized visits cannot be deleted.');
        }

        $visit->delete();

        return redirect()->route('admin.visits.index')->with('success', 'Visit deleted.');
    }

    public function suggestions(Request $request)
    {
        $symptomIds = $request->symptoms ?? [];
        if (empty($symptomIds)) {
            return response()->json([]);
        }

        $suggestions = DB::table('symptom_medicine_map')
            ->select('medicine_id', DB::raw('COUNT(*) AS match_score'), DB::raw('MIN(priority) AS best_priority'))
            ->whereIn('symptom_id', $symptomIds)
            ->groupBy('medicine_id')
            ->orderByDesc('match_score')
            ->orderBy('best_priority')
            ->limit(10)
            ->get();

        $medicineIds = $suggestions->pluck('medicine_id');
        $medicines = Medicine::whereIn('id', $medicineIds)->get()->keyBy('id');

        $result = $suggestions->map(function ($s) use ($medicines) {
            $m = $medicines[$s->medicine_id] ?? null;

            return [
                'medicine_id' => $s->medicine_id,
                'medicine_name' => $m ? $m->name : 'Unknown',
                'match_score' => $s->match_score,
                'best_priority' => $s->best_priority,
            ];
        });

        return response()->json($result);
    }

    public function pdf(Visit $visit)
    {
        $visit->load(['patient', 'doctor', 'symptoms', 'prescriptionItems.medicine', 'adviceItems', 'foodRestrictions']);
        $settings = ClinicSetting::first();
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        $pdf = Pdf::loadView('pdf.prescription', [
            'visit' => $visit,
            'settings' => $settings,
            'prescriptionConfig' => $prescriptionConfig,
        ]);

        return $pdf->stream('prescription-'.$visit->id.'.pdf');
    }
}
