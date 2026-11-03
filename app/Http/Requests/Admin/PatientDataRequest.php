<?php

namespace App\Http\Requests\Admin;

use App\Models\ClinicSetting;
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
            'guardian_relationship' => [Rule::in($this->allowedRelationshipValues())],
            'guardian_name' => ['string', 'max:255'],
            'gender' => [Rule::in(['male', 'female', 'other'])],
            'age_years' => ['integer', 'min:0', 'max:150'],
            'age_months' => ['integer', 'min:0', 'max:11'],
            'age_days' => ['integer', 'min:0', 'max:31'],
            'dob' => ['date'],
            'phone' => ['string', 'regex:/^(\+?8801|01)[3-9]\d{8}$/'],
            'referred_by' => ['string', 'max:255'],
            'address' => ['string', 'max:500'],
            'blood_group' => ['string', 'max:10'],
            'known_allergies' => ['string', 'max:1000'],
        ];
        $rules = [];

        if ($this->isMethod('post')) {
            $rules['patient_numbering_profile_id'] = [
                'required',
                'integer',
                Rule::exists('patient_numbering_profiles', 'id')
                    ->where(fn ($query) => $query->where('is_active', true)->whereNull('deleted_at')),
            ];
        }

        foreach ($fieldRules as $field => $rulesForField) {
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
}
