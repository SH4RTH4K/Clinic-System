<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateClinicSettingsRequest;
use App\Models\ClinicSetting;
use App\Models\PatientNumberingProfile;
use Inertia\Inertia;

class ClinicSettingController extends Controller
{
    public function edit()
    {
        $settings = ClinicSetting::first();

        return Inertia::render('Admin/Settings/Edit', ['settings' => $settings]);
    }

    public function editGeneral()
    {
        $profiles = PatientNumberingProfile::query()
            ->with('sequences')
            ->withCount('patients')
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
                    'category_code' => $profile->category_code,
                    'prefix' => $profile->prefix,
                    'include_year' => $profile->include_year,
                    'reset_annually' => $profile->reset_annually,
                    'separator' => $profile->separator,
                    'number_padding' => $profile->number_padding,
                    'starting_number' => $profile->starting_number,
                    'is_active' => $profile->is_active,
                    'is_default' => $profile->is_default,
                    'patients_count' => $profile->patients_count,
                    'next_number' => $nextNumber,
                    'preview' => $profile->formatPatientIdentifier($nextNumber),
                ];
            });

        return Inertia::render('Admin/Settings/General', [
            'profiles' => $profiles,
        ]);
    }

    public function update(UpdateClinicSettingsRequest $request)
    {
        $validated = $request->validated();

        $settings = ClinicSetting::first();
        if ($settings) {
            $settings->update($validated);
        } else {
            ClinicSetting::create([
                ...$validated,
                'doctor_name' => '',
                'doctor_credentials' => '',
                'patient_no_series' => 'A',
                'patient_no_next' => 1,
            ]);
        }

        return redirect()->route('admin.settings.edit')->with('success', 'Settings updated.');
    }
}
