<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePharmaceuticalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('pharmaceuticals.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'generic_name' => ['required', 'string', 'max:255'],
            'brand_name' => ['required', 'string', 'max:255'],
            'dosage_form' => ['required', 'string', 'max:50'],
            'strength' => ['required', 'string', 'max:100'],
            'manufacturer' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
