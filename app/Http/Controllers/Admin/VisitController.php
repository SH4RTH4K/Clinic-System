<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdviceItem;
use App\Models\ClinicSetting;
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
        $query = Visit::with('patient')->latest();

        return Inertia::render('Admin/Visits/Index', [
            'visits' => $query->paginate(10),
        ]);
    }

    public function create(Request $request)
    {
        $patient = null;
        if ($request->patient_id) {
            $patient = Patient::find($request->patient_id);
        }

        return Inertia::render('Admin/Visits/Create', [
            'patient' => $patient,
            'patients' => Patient::all(),
            'symptoms' => Symptom::where('is_active', true)->get(),
            'medicines' => Medicine::where('is_active', true)->get(),
            'defaultAdvice' => AdviceItem::where('is_default', true)->get(),
            'defaultFood' => FoodRestriction::where('is_default', true)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'visit_date' => 'required|date',
            'age_at_visit' => 'nullable|integer',
            'chief_complaint' => 'required|string',
            'bp_symptoms_notes' => 'nullable|string',
            'diagnosis_notes' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'status' => 'required|in:draft,finalized',
            'symptoms' => 'array',
            'prescription_items' => 'array',
            'advice_items' => 'array',
            'food_restrictions' => 'array',
        ]);

        DB::transaction(function () use ($validated) {
            $visit = Visit::create([
                'patient_id' => $validated['patient_id'],
                'visit_date' => $validated['visit_date'],
                'age_at_visit' => $validated['age_at_visit'] ?? null,
                'chief_complaint' => $validated['chief_complaint'],
                'bp_symptoms_notes' => $validated['bp_symptoms_notes'] ?? null,
                'diagnosis_notes' => $validated['diagnosis_notes'] ?? null,
                'follow_up_date' => $validated['follow_up_date'] ?? null,
                'status' => $validated['status'],
                'created_by' => Auth::id(),
            ]);

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
        $visit->load(['patient', 'symptoms', 'prescriptionItems.medicine', 'adviceItems', 'foodRestrictions']);

        return Inertia::render('Admin/Visits/Show', ['visit' => $visit]);
    }

    public function edit(Visit $visit)
    {
        $visit->load(['symptoms', 'prescriptionItems', 'adviceItems', 'foodRestrictions']);

        return Inertia::render('Admin/Visits/Edit', [
            'visit' => $visit,
            'patients' => Patient::all(),
            'symptoms' => Symptom::where('is_active', true)->get(),
            'medicines' => Medicine::where('is_active', true)->get(),
            'allAdvice' => AdviceItem::all(),
            'allFood' => FoodRestriction::all(),
        ]);
    }

    public function update(Request $request, Visit $visit)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'visit_date' => 'required|date',
            'age_at_visit' => 'nullable|integer',
            'chief_complaint' => 'required|string',
            'bp_symptoms_notes' => 'nullable|string',
            'diagnosis_notes' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'status' => 'required|in:draft,finalized',
            'symptoms' => 'array',
            'prescription_items' => 'array',
            'advice_items' => 'array',
            'food_restrictions' => 'array',
        ]);

        DB::transaction(function () use ($validated, $visit) {
            $visit->update([
                'patient_id' => $validated['patient_id'],
                'visit_date' => $validated['visit_date'],
                'age_at_visit' => $validated['age_at_visit'] ?? null,
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
                $visit->prescriptionItems()->delete();
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
        $visit->load(['patient', 'symptoms', 'prescriptionItems.medicine', 'adviceItems', 'foodRestrictions']);
        $settings = ClinicSetting::first();

        // PDF requires view. Let's return it as download or stream.
        $pdf = Pdf::loadView('pdf.prescription', [
            'visit' => $visit,
            'settings' => $settings,
        ]);

        return $pdf->stream('prescription-'.$visit->id.'.pdf');
    }
}
