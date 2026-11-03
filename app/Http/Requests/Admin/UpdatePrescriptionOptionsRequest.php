<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePrescriptionOptionsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->hasRole('Super Admin') === true
            || ($user?->hasAnyPermission([
                'prescription_options.create',
                'prescription_options.update',
                'prescription_options.delete',
            ]) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'timing_options' => ['nullable', 'array'],
            'timing_options.*.key' => ['required', 'string', 'max:50', 'distinct:strict'],
            'timing_options.*.label_en' => ['required', 'string', 'max:100'],
            'timing_options.*.label_bn' => ['nullable', 'string', 'max:100'],
            'dose_units' => ['nullable', 'array'],
            'dose_units.*.key' => ['required', 'string', 'max:50', 'distinct:strict'],
            'dose_units.*.label_en' => ['required', 'string', 'max:100'],
            'dose_units.*.label_bn' => ['nullable', 'string', 'max:100'],
            'meal_relations' => ['nullable', 'array'],
            'meal_relations.*.key' => ['required', 'string', 'max:50', 'distinct:strict'],
            'meal_relations.*.label_en' => ['required', 'string', 'max:100'],
            'meal_relations.*.label_bn' => ['nullable', 'string', 'max:100'],
            'dilution_instructions' => ['nullable', 'array'],
            'dilution_instructions.*' => ['required', 'string', 'max:255', 'distinct:strict'],
            'duration_presets' => ['nullable', 'array'],
            'duration_presets.*' => ['required', 'integer', 'min:1', 'max:365', 'distinct:strict'],
            'default_duration_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'default_dose_qty' => ['nullable', 'numeric', 'min:0.1', 'max:100'],
            'default_dose_unit' => ['nullable', 'string', 'max:50'],
        ];
    }
}
