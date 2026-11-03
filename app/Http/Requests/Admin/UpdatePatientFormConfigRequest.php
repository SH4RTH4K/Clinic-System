<?php

namespace App\Http\Requests\Admin;

use App\Models\ClinicSetting;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientFormConfigRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin') === true
            || ($this->user()?->hasAnyPermission(['patient_config.create', 'patient_config.update', 'patient_config.order']) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $fieldKeys = array_keys(ClinicSetting::defaultPatientFormConfig());
        $rules = [
            'fields' => ['required', 'array:'.implode(',', $fieldKeys)],
            'relationships' => ['present', 'array', 'max:50'],
            'relationships.*' => ['required', 'array:value,label'],
            'relationships.*.value' => ['required', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]{1,49}$/', 'distinct:strict'],
            'relationships.*.label' => ['required', 'string', 'max:80'],
        ];

        foreach ($fieldKeys as $fieldKey) {
            $rules["fields.{$fieldKey}"] = ['required', 'array:label,visible,required,order'];
            $rules["fields.{$fieldKey}.label"] = ['required', 'string', 'max:80'];
            $rules["fields.{$fieldKey}.visible"] = ['required', 'boolean'];
            $rules["fields.{$fieldKey}.required"] = ['required', 'boolean'];
            $rules["fields.{$fieldKey}.order"] = ['required', 'integer', 'min:1', 'max:100'];
        }

        return $rules;
    }
}
