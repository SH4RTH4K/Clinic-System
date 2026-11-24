<?php

namespace App\Http\Requests\Admin;

use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\PatientNumberingProfile;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class PatientDataRequest extends FormRequest
{
    /**
     * @return array<string, array<int, string|ValidationRule>>
     */
    public function rules(): array
    {
        if ($this->isMethod('post') && ! $this->filled('patient_numbering_profile_id')) {
            $defaultProfileId = PatientNumberingProfile::query()
                ->where('is_active', true)
                ->where('is_default', true)
                ->value('id');

            if ($defaultProfileId) {
                $this->merge(['patient_numbering_profile_id' => $defaultProfileId]);
            }
        }

        $config = ClinicSetting::currentPatientFormConfig();
        $fieldRules = [
            'name' => ['string', 'max:255'],
            'old_or_other_id' => ['string', 'max:'.($config['old_or_other_id']['max_length'] ?? 50)],
            'guardian_relationship' => [Rule::in($this->allowedRelationshipValues())],
            'guardian_name' => ['string', 'max:255'],
            'gender' => [Rule::in(['male', 'female', 'other'])],
            'age_years' => ['integer', 'min:0', 'max:150'],
            'age_months' => ['integer', 'min:0', 'max:11'],
            'age_days' => ['integer', 'min:0', 'max:31'],
            'dob' => ['date'],
            'phone' => ['string', 'regex:/^(\+?8801|01)[3-9]\d{8}$/'],
            'referred_by' => ['string', 'max:255'],
            'reference_number' => ['string', 'max:'.$config['reference_number']['max_length']],
            'address' => ['string', 'max:500'],
            'blood_group' => ['string', 'max:10'],
            'known_allergies' => ['string', 'max:1000'],
            'medical_history' => ['string', 'max:5000'],
        ];
        $rules = [
            'old_or_other_id_mode' => ['sometimes', 'nullable', 'string', Rule::in(['auto', 'manual', 'none'])],
            'photo' => ['sometimes', 'nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'photo_webcam_data' => ['sometimes', 'nullable', 'string'],
            'remove_photo' => ['sometimes', 'nullable', 'boolean'],
        ];
        $canViewClinicalRecords = $this->user()?->can('clinical_records.view') === true;

        if ($this->isMethod('post')) {
            $rules['patient_numbering_profile_id'] = [
                'required',
                'integer',
                Rule::exists('patient_numbering_profiles', 'id')
                    ->where(fn ($query) => $query->where('is_active', true)->whereNull('deleted_at')),
            ];
            $rules['appointment_request_id'] = [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('appointment_requests', 'id'),
            ];
        }

        foreach ($fieldRules as $field => $rulesForField) {
            if (in_array($field, ['blood_group', 'known_allergies', 'medical_history'], true) && ! $canViewClinicalRecords) {
                continue;
            }

            if (! $config[$field]['visible']) {
                continue;
            }

            $rules[$field] = [
                ($field === 'name' || $config[$field]['required']) ? 'required' : 'nullable',
                ...$rulesForField,
            ];
        }

        return $rules;
    }

    /** @return list<string> */
    protected function allowedRelationshipValues(): array
    {
        return array_values(array_map(
            fn (array $option): string => $option['value'],
            ClinicSetting::currentPatientRelationshipOptions(),
        ));
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return array_map(
            fn (array $field): string => $field['label'],
            ClinicSetting::currentPatientFormConfig(),
        );
    }

    protected function prepareForValidation(): void
    {
        $oldOrOtherIdConfig = ClinicSetting::currentOldOrOtherIdConfig();
        $mode = $this->input('old_or_other_id_mode') ?? $oldOrOtherIdConfig['mode'];

        if ($mode === 'auto' && $this->isMethod('post') && ! $this->filled('old_or_other_id')) {
            $this->merge([
                'old_or_other_id' => Patient::generateNextOldOrOtherId(
                    $oldOrOtherIdConfig['prefix'],
                    $oldOrOtherIdConfig['number_padding']
                ),
            ]);
        }
    }
}
