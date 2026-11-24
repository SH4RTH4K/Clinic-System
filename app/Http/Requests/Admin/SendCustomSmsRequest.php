<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SendCustomSmsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin') || $this->user()?->can('communications.send');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'patient_id' => ['nullable', 'exists:patients,id'],
            'phone' => ['required', 'string', 'max:50'],
            'message' => ['required', 'string', 'max:500'],
        ];
    }
}
