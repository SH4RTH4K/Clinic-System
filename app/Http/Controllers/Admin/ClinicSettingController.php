<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateClinicSettingsRequest;
use App\Http\Requests\Admin\UpdateOldOrOtherIdConfigRequest;
use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\PatientNumberingProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ClinicSettingController extends Controller
{
    public function edit()
    {
        $settings = ClinicSetting::first();

        return Inertia::render('Admin/Settings/Edit', [
            'settings' => $settings,
            'logoUrl' => $settings?->logo_path ? route('clinic.logo') : null,
            'faviconUrl' => $settings?->favicon_path ? route('clinic.favicon') : null,
        ]);
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

        $oldOrOtherIdConfig = ClinicSetting::currentOldOrOtherIdConfig();
        $oldOrOtherIdPreview = Patient::generateNextOldOrOtherId(
            $oldOrOtherIdConfig['prefix'],
            $oldOrOtherIdConfig['number_padding']
        );

        return Inertia::render('Admin/Settings/General', [
            'profiles' => $profiles,
            'oldOrOtherIdConfig' => array_merge($oldOrOtherIdConfig, [
                'preview' => $oldOrOtherIdPreview,
            ]),
        ]);
    }

    public function updateOldOrOtherIdConfig(UpdateOldOrOtherIdConfigRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $settings = ClinicSetting::query()->firstOrCreate([], [
            'clinic_name_en' => 'Clinic',
        ]);

        $stored = $settings->patient_form_config ?? [];
        $stored['old_or_other_id_numbering'] = [
            'mode' => $validated['mode'],
            'prefix' => $validated['prefix'] ?? 'OLD-',
            'number_padding' => (int) $validated['number_padding'],
            'allow_staff_override' => (bool) $validated['allow_staff_override'],
            'max_length' => (int) $validated['max_length'],
        ];

        if (isset($stored['fields']['old_or_other_id'])) {
            $stored['fields']['old_or_other_id']['max_length'] = (int) $validated['max_length'];
            $stored['fields']['old_or_other_id']['mode'] = $validated['mode'];
            $stored['fields']['old_or_other_id']['prefix'] = $validated['prefix'] ?? 'OLD-';
            $stored['fields']['old_or_other_id']['number_padding'] = (int) $validated['number_padding'];
            $stored['fields']['old_or_other_id']['allow_staff_override'] = (bool) $validated['allow_staff_override'];
        }

        $settings->update(['patient_form_config' => $stored]);

        return redirect()->route('admin.general_settings.edit')->with('success', 'Old/Other ID numbering configuration updated successfully.');
    }

    public function update(UpdateClinicSettingsRequest $request)
    {
        $validated = $request->validated();
        $settings = ClinicSetting::first();

        // Handle Clinic Logo upload / removal
        if ($request->boolean('remove_logo')) {
            if ($settings?->logo_path) {
                Storage::disk('public')->delete($settings->logo_path);
            }
            $validated['logo_path'] = null;
        } elseif ($request->hasFile('logo')) {
            if ($settings?->logo_path) {
                Storage::disk('public')->delete($settings->logo_path);
            }
            $validated['logo_path'] = $request->file('logo')->store('branding', 'public');
        }
        unset($validated['logo'], $validated['remove_logo']);

        // Handle Clinic Favicon upload / removal
        if ($request->boolean('remove_favicon')) {
            if ($settings?->favicon_path) {
                Storage::disk('public')->delete($settings->favicon_path);
            }
            $validated['favicon_path'] = null;
        } elseif ($request->hasFile('favicon')) {
            if ($settings?->favicon_path) {
                Storage::disk('public')->delete($settings->favicon_path);
            }
            $validated['favicon_path'] = $request->file('favicon')->store('branding', 'public');
        }
        unset($validated['favicon'], $validated['remove_favicon']);

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
