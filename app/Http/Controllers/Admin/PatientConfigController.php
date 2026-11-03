<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DeletePatientRelationshipRequest;
use App\Http\Requests\Admin\UpdatePatientFormConfigRequest;
use App\Models\ClinicSetting;
use App\Models\Patient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PatientConfigController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/PatientConfig/Edit', [
            'fields' => ClinicSetting::currentPatientFormConfig(),
            'relationships' => ClinicSetting::currentPatientRelationshipOptions(),
        ]);
    }

    public function update(UpdatePatientFormConfigRequest $request)
    {
        $fields = $request->validated('fields');
        $relationships = $request->validated('relationships');
        $fields['name']['visible'] = true;
        $fields['name']['required'] = true;
        $fields['gender']['visible'] = true;
        $fields['gender']['required'] = true;

        $orderGroups = ClinicSetting::patientFormFieldOrderGroups();
        $orderedGroups = array_keys($orderGroups);
        usort($orderedGroups, fn (string $firstGroup, string $secondGroup): int => $fields[$firstGroup]['order'] <=> $fields[$secondGroup]['order']);

        foreach ($orderedGroups as $position => $groupKey) {
            foreach ($orderGroups[$groupKey] as $fieldKey) {
                $fields[$fieldKey]['order'] = $position + 1;
            }
        }

        $existingFields = ClinicSetting::currentPatientFormConfig();
        $existingRelationships = ClinicSetting::currentPatientRelationshipOptions();
        $fieldsWithoutOrder = collect($fields)
            ->map(fn (array $field): array => collect($field)->except('order')->all())
            ->all();
        $existingFieldsWithoutOrder = collect($existingFields)
            ->map(fn (array $field): array => collect($field)->except('order')->all())
            ->all();
        $requiresOrder = collect($fields)->contains(
            fn (array $field, string $fieldKey): bool => $field['order'] !== $existingFields[$fieldKey]['order'],
        );
        $existingRelationshipsByValue = collect($existingRelationships)->keyBy('value')->all();
        $updatedRelationshipsByValue = collect($relationships)->keyBy('value')->all();
        $existingValues = array_keys($existingRelationshipsByValue);
        $updatedValues = array_keys($updatedRelationshipsByValue);
        $addedValues = array_diff($updatedValues, $existingValues);
        $removedValues = array_diff($existingValues, $updatedValues);
        $updatedExistingRelationships = collect(array_intersect($existingValues, $updatedValues))
            ->contains(fn (string $value): bool => $existingRelationshipsByValue[$value]['label'] !== $updatedRelationshipsByValue[$value]['label']);
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $requiresUpdate = $fieldsWithoutOrder != $existingFieldsWithoutOrder || $updatedExistingRelationships;

        abort_if($removedValues !== [], 403);
        abort_unless($isSuperAdmin || $addedValues === [] || $user->can('patient_config.create'), 403);
        abort_unless(! $requiresUpdate || $isSuperAdmin || $user->can('patient_config.update'), 403);
        abort_unless(! $requiresOrder || $isSuperAdmin || $user->can('patient_config.order'), 403);

        $settings = ClinicSetting::query()->first();

        if (! $settings) {
            $settings = ClinicSetting::create([
                'clinic_name_en' => 'Homeopathy Clinic',
                'phone' => '01700000000',
                'address' => 'Dhaka',
                'patient_no_series' => 'A',
                'patient_no_next' => 1,
                'doctor_name' => '',
                'doctor_credentials' => '',
            ]);
        }

        $settings->update(['patient_form_config' => [
            'fields' => $fields,
            'relationships' => $relationships,
        ]]);

        return redirect()->route('admin.patient_config.edit')->with('success', 'Patient form configuration updated.');
    }

    public function destroyRelationship(DeletePatientRelationshipRequest $request): RedirectResponse
    {
        return DB::transaction(function () use ($request): RedirectResponse {
            $relationshipValue = $request->validated('relationship');
            $settings = ClinicSetting::query()->lockForUpdate()->first();
            $relationships = $settings?->getPatientRelationshipOptions() ?? ClinicSetting::defaultPatientRelationshipOptions();
            $relationship = collect($relationships)->firstWhere('value', $relationshipValue);

            if (! $relationship) {
                return back()->withErrors(['relationshipDelete' => 'This relationship option no longer exists. Refresh the page and try again.']);
            }

            $patientCount = Patient::withTrashed()
                ->where('guardian_relationship', $relationshipValue)
                ->count();

            if ($patientCount > 0) {
                $recordLabel = Str::plural('patient record', $patientCount);
                $instruction = $patientCount === 1 ? 'Update that record first.' : 'Update those records first.';

                return back()->withErrors([
                    'relationshipDelete' => "Cannot delete {$relationship['label']}; it is used by {$patientCount} {$recordLabel}. {$instruction}",
                ]);
            }

            if (! $settings) {
                $settings = ClinicSetting::create([
                    'clinic_name_en' => 'Homeopathy Clinic',
                    'phone' => '01700000000',
                    'address' => 'Dhaka',
                    'patient_no_series' => 'A',
                    'patient_no_next' => 1,
                    'doctor_name' => '',
                    'doctor_credentials' => '',
                ]);
            }

            $relationships = array_values(array_filter(
                $relationships,
                fn (array $option): bool => $option['value'] !== $relationshipValue,
            ));
            $settings->update(['patient_form_config' => [
                'fields' => $settings->getPatientFormConfig(),
                'relationships' => $relationships,
            ]]);

            return back()->with('success', "{$relationship['label']} relationship deleted.");
        });
    }
}
