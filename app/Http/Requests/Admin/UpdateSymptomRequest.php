<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSymptomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('symptoms.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'name_en' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'name_bn' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'modalities' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ];
    }
}
