<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClinicSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClinicSettingController extends Controller
{
    public function edit()
    {
        $settings = ClinicSetting::first();
        if ($settings) {
            $settings->prescription_config = $settings->getPrescriptionConfig();
        }

        return Inertia::render('Admin/Settings/Edit', ['settings' => $settings]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'clinic_name_en' => 'required|string|max:255',
            'clinic_name_bn' => 'nullable|string|max:255',
            'phone' => 'required|string|max:255',
            'address' => 'required|string',
            'visiting_hours' => 'nullable|string',
            'patient_no_series' => 'required|string|max:50',
            'patient_no_next' => 'required|integer|min:1',
            'prescription_header_image' => 'nullable|string',
            'footer_text' => 'nullable|string|max:255',
            'about_text' => 'nullable|string|max:5000',
            'about_text_bn' => 'nullable|string|max:5000',
            'developer_name' => 'nullable|string|max:255',
            'developer_link' => 'nullable|url|max:255',
            'visiting_hours_schedule' => 'nullable|array',
            'visiting_hours_schedule.mode' => 'nullable|string|in:no_hours,always_open,permanently_closed,temporarily_closed,selected_hours',
            'visiting_hours_schedule.days' => 'nullable|array',
            'prescription_config' => 'nullable|array',
        ]);

        $settings = ClinicSetting::first();
        if ($settings) {
            $settings->update($validated);
        } else {
            ClinicSetting::create([
                ...$validated,
                'doctor_name' => '',
                'doctor_credentials' => '',
            ]);
        }

        return redirect()->route('admin.settings.edit')->with('success', 'Settings updated.');
    }

    public function updatePrescriptionConfig(Request $request)
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

        return back()->with('success', 'Prescription configuration updated.');
    }
}
