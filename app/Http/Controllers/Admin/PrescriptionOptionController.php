<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdatePrescriptionOptionsRequest;
use App\Models\ClinicSetting;
use Illuminate\Support\Arr;
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

    public function update(UpdatePrescriptionOptionsRequest $request)
    {
        $settings = ClinicSetting::first();
        $existingConfig = $settings?->getPrescriptionConfig() ?? ClinicSetting::defaultPrescriptionConfig();
        $validated = array_replace($existingConfig, $request->validated());
        $requiredPermissions = $this->permissionsForChanges($existingConfig, $validated);

        foreach ($requiredPermissions as $permission) {
            abort_unless(
                $request->user()->hasRole('Super Admin') || $request->user()->can($permission),
                403,
            );
        }

        $settings ??= ClinicSetting::firstOrCreate([], [
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

    /**
     * @param  array<string, mixed>  $existingConfig
     * @param  array<string, mixed>  $updatedConfig
     * @return array<int, string>
     */
    private function permissionsForChanges(array $existingConfig, array $updatedConfig): array
    {
        $requiredPermissions = [];

        foreach (['timing_options', 'dose_units', 'meal_relations'] as $field) {
            $existingItems = collect($existingConfig[$field] ?? [])->keyBy('key')->all();
            $updatedItems = collect($updatedConfig[$field] ?? [])->keyBy('key')->all();
            $existingKeys = array_keys($existingItems);
            $updatedKeys = array_keys($updatedItems);

            if (array_diff($updatedKeys, $existingKeys) !== []) {
                $requiredPermissions[] = 'prescription_options.create';
            }

            if (array_diff($existingKeys, $updatedKeys) !== []) {
                $requiredPermissions[] = 'prescription_options.delete';
            }

            foreach (array_intersect($existingKeys, $updatedKeys) as $key) {
                if ($existingItems[$key] !== $updatedItems[$key]) {
                    $requiredPermissions[] = 'prescription_options.update';
                    break;
                }
            }
        }

        foreach (['dilution_instructions', 'duration_presets'] as $field) {
            $existingItems = array_values($existingConfig[$field] ?? []);
            $updatedItems = array_values($updatedConfig[$field] ?? []);

            if (array_diff($updatedItems, $existingItems) !== []) {
                $requiredPermissions[] = 'prescription_options.create';
            }

            if (array_diff($existingItems, $updatedItems) !== []) {
                $requiredPermissions[] = 'prescription_options.delete';
            }

            if ($existingItems !== $updatedItems
                && array_diff($updatedItems, $existingItems) === []
                && array_diff($existingItems, $updatedItems) === []) {
                $requiredPermissions[] = 'prescription_options.update';
            }
        }

        foreach (['default_duration_days', 'default_dose_qty', 'default_dose_unit'] as $field) {
            if (Arr::get($existingConfig, $field) !== Arr::get($updatedConfig, $field)) {
                $requiredPermissions[] = 'prescription_options.update';
            }
        }

        return array_values(array_unique($requiredPermissions));
    }
}
