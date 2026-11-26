<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLabInvestigationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('lab_investigations.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('specimen_type') || blank($this->input('specimen_type'))) {
            $this->merge(['specimen_type' => 'blood']);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'name_bn' => ['nullable', 'string', 'max:255'],
            'category' => ['required', 'string', 'in:hematology,biochemistry,radiology,ultrasound,microbiology,other'],
            'specimen_type' => ['nullable', 'string', 'in:blood,urine,stool,sputum,swab,imaging,tissue,other'],
            'standard_cost' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'default_instructions' => ['nullable', 'string', 'max:2000'],
            'reference_range' => ['nullable', 'string', 'max:2000'],
            'turnaround_time' => ['nullable', 'string', 'max:100'],
            'is_active' => ['boolean'],
        ];
    }
}
