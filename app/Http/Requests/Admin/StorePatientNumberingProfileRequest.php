<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePatientNumberingProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && ($user->hasRole('Super Admin') || $user->can('general_settings.create'));
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name', '')),
            'category' => trim((string) $this->input('category', '')),
            'category_code' => strtoupper(trim((string) $this->input('category_code', ''))),
            'prefix' => strtoupper(trim((string) $this->input('prefix', ''))),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('patient_numbering_profiles', 'name')->whereNull('deleted_at')],
            'category' => ['required', 'string', 'max:100'],
            'category_code' => ['nullable', 'string', 'max:10', 'regex:/^[A-Z0-9]+$/'],
            'prefix' => ['required', 'string', 'max:10', 'regex:/^[A-Z0-9]+$/'],
            'include_year' => ['required', 'boolean'],
            'reset_annually' => ['required', 'boolean', Rule::prohibitedIf(! $this->boolean('include_year'))],
            'separator' => ['required', Rule::in(['-', '/', '.'])],
            'number_padding' => ['required', 'integer', 'min:0', 'max:20'],
            'starting_number' => ['required', 'integer', 'min:1', 'max:99999999'],
            'is_active' => ['required', 'boolean'],
            'is_default' => ['required', 'boolean'],
        ];
    }
}
