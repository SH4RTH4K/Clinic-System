<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatientNumberingProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && ($user->hasRole('Super Admin') || $user->can('general_settings.update'));
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
        $profile = $this->route('profile');

        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('patient_numbering_profiles', 'name')->ignore($profile?->id)->whereNull('deleted_at')],
            'category' => ['required', 'string', 'max:100'],
            'category_code' => ['nullable', 'string', 'max:10', 'regex:/^[A-Z0-9]+$/'],
            'prefix' => ['required', 'string', 'max:10', 'regex:/^[A-Z0-9]+$/'],
            'include_year' => ['required', 'boolean'],
            'reset_annually' => ['required', 'boolean', Rule::prohibitedIf(! $this->boolean('include_year'))],
            'separator' => ['required', Rule::in(['-', '/', '.'])],
            'number_padding' => ['required', 'integer', 'min:0', 'max:20'],
            'is_active' => ['required', 'boolean'],
            'is_default' => ['required', 'boolean'],
        ];
    }
}
