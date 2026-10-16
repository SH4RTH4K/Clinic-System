<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClinicSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrescriptionOptionController extends Controller
{
    public function edit(): Response
    {
        $settings = ClinicSetting::first();
        $config = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        return Inertia::render('Admin/PrescriptionOptions/Edit', [
            'config' => $config,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'timing_options' => 'nullable|array',
            'timing_options.*.key' => 'required|string|max:50',
            'timing_options.*.label_en' => 'required|string|max:100',
            'timing_options.*.label_bn' => 'nullable|string|max:100',
            'dose_units' => 'nullable|array',
            'dose_units.*.key' => 'required|string|max:50',
            'dose_units.*.label_en' => 'required|string|max:100',
            'dose_units.*.label_bn' => 'nullable|string|max:100',
            'meal_relations' => 'nullable|array',
            'meal_relations.*.key' => 'required|string|max:50',
            'meal_relations.*.label_en' => 'required|string|max:100',
            'meal_relations.*.label_bn' => 'nullable|string|max:100',
            'dilution_instructions' => 'nullable|array',
            'dilution_instructions.*' => 'required|string|max:255',
            'duration_presets' => 'nullable|array',
            'duration_presets.*' => 'required|integer|min:1|max:365',
            'default_duration_days' => 'nullable|integer|min:1|max:365',
            'default_dose_qty' => 'nullable|numeric|min:0.1|max:100',
            'default_dose_unit' => 'nullable|string|max:50',
        ]);

        $settings = ClinicSetting::firstOrCreate([], [
            'clinic_name_en' => 'Homeopathy Clinic',
            'phone' => '01700000000',
            'address' => 'Dhaka',
            'patient_no_series' => 'HC',
            'patient_no_next' => 1,
            'doctor_name' => '',
            'doctor_credentials' => '',
        ]);

        $settings->update(['prescription_config' => $validated]);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => 'Prescription configuration updated.',
                'prescription_config' => $settings->getPrescriptionConfig(),
            ]);
        }

        return back()->with('success', 'Prescription options and presets updated successfully.');
    }
}
