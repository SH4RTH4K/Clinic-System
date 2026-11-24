<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLabInvestigationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('lab_investigations.create') ?? false;
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
