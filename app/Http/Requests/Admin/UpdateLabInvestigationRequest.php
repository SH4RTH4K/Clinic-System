<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLabInvestigationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('lab_investigations.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'in:hematology,biochemistry,radiology,ultrasound,microbiology,other'],
            'default_instructions' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
