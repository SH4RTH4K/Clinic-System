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
            'developer_name' => 'nullable|string|max:255',
            'developer_link' => 'nullable|url|max:255',
            'visiting_hours_schedule' => 'nullable|array',
            'visiting_hours_schedule.mode' => 'nullable|string|in:no_hours,always_open,permanently_closed,temporarily_closed,selected_hours',
            'visiting_hours_schedule.days' => 'nullable|array',
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
}
