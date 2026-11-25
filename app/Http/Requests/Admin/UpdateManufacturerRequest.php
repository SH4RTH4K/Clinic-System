<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateManufacturerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manufacturers.update') ?? false;
    }

    public function rules(): array
    {
        $manufacturerId = $this->route('manufacturer')?->id ?? $this->route('manufacturer');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('manufacturers', 'name')->ignore($manufacturerId)],
            'short_name' => ['nullable', 'string', 'max:100'],
            'name_bn' => ['nullable', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(['allopathic', 'homeopathic', 'dual', 'surgical'])],
            'contact_person' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string'],
            'website' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
