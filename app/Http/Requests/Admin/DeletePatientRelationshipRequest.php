<?php

namespace App\Http\Requests\Admin;

use App\Models\ClinicSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeletePatientRelationshipRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make the request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin') === true
            || ($this->user()?->can('patient_config.delete') ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'relationship' => [
                'required',
                'string',
                Rule::in(array_column(ClinicSetting::currentPatientRelationshipOptions(), 'value')),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['relationship' => $this->route('relationship')]);
    }
}
