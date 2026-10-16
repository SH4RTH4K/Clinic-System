<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClinicSetting;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $query = Patient::query();
        if ($request->search) {
            $query->where(fn ($q) => $q->where('name', 'like', '%'.$request->search.'%')
                ->orWhere('phone', 'like', '%'.$request->search.'%')
                ->orWhere('patient_no', 'like', '%'.$request->search.'%'));
        }

        return Inertia::render('Admin/Patients/Index', [
            'patients' => $query->latest()->paginate(10)->withQueryString(),
            'filters' => $request->only(['search']),
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

        $patients = Patient::select('id', 'patient_no', 'patient_series', 'name', 'age_years', 'age_months', 'age_days', 'gender')
            ->where(fn ($q) => $q->where('name', 'like', '%'.$term.'%')
                ->orWhere('patient_no', 'like', '%'.$term.'%')
                ->orWhere('patient_series', 'like', '%'.$term.'%'))
            ->orderBy('name')
            ->limit(10)
            ->get();

        return response()->json($patients);
    }

    public function create(Request $request)
    {
        return Inertia::render('Admin/Patients/Create', [
            'defaults' => $request->only(['name', 'phone']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'guardian_name' => 'nullable|string|max:255',
            'gender' => 'required|in:male,female,other',
            'age_years' => 'nullable|integer|min:0|max:150',
            'age_months' => 'nullable|integer|min:0|max:11',
            'age_days' => 'nullable|integer|min:0|max:31',
            'dob' => 'nullable|date',
            'phone' => ['nullable', 'regex:/^(\+?8801|01)[3-9]\d{8}$/'],
            'address' => 'nullable|string|max:500',
            'blood_group' => 'nullable|string|max:10',
            'known_allergies' => 'nullable|string|max:1000',
            'referred_by' => 'nullable|string|max:255',
        ]);

        $patient = null;
        DB::transaction(function () use ($validated, &$patient) {
            $settings = ClinicSetting::lockForUpdate()->first();
            $no = $settings->patient_no_next;
            $series = $settings->patient_no_series;

            $settings->update(['patient_no_next' => $no + 1]);

            $patient = Patient::create(array_merge($validated, [
                'patient_no' => $no,
                'patient_series' => $series,
                'created_by' => Auth::id(),
            ]));
        });

        return redirect()->route('admin.patients.index')->with('success', 'Patient created successfully.');
    }

    public function show(Patient $patient)
    {
        $patient->load(['visits' => function ($query) {
            $query->latest();
        }, 'visits.prescriptionItems.medicine']);

        return Inertia::render('Admin/Patients/Show', compact('patient'));
    }

    public function edit(Patient $patient)
    {
        return Inertia::render('Admin/Patients/Edit', compact('patient'));
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'guardian_name' => 'nullable|string|max:255',
            'gender' => 'required|in:male,female,other',
            'age_years' => 'nullable|integer|min:0|max:150',
            'age_months' => 'nullable|integer|min:0|max:11',
            'age_days' => 'nullable|integer|min:0|max:31',
            'dob' => 'nullable|date',
            'phone' => ['nullable', 'regex:/^(\+?8801|01)[3-9]\d{8}$/'],
            'address' => 'nullable|string|max:500',
            'blood_group' => 'nullable|string|max:10',
            'known_allergies' => 'nullable|string|max:1000',
            'referred_by' => 'nullable|string|max:255',
        ]);
        $patient->update($validated);

        return redirect()->route('admin.patients.index')->with('success', 'Patient updated successfully.');
    }

    public function destroy(Patient $patient)
    {
        $patient->delete();

        return redirect()->route('admin.patients.index')->with('success', 'Patient deleted successfully.');
    }
}
