<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreQueueTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin') || $this->user()?->can('queue.manage') || $this->user()?->can('queue.view');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'patient_id' => ['nullable', 'exists:patients,id'],
            'patient_name' => ['required_without:patient_id', 'nullable', 'string', 'max:255'],
            'patient_phone' => ['nullable', 'string', 'max:50'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'service_room' => ['nullable', 'string', 'max:100'],
            'priority' => ['required', 'in:normal,urgent'],
            'token_date' => ['nullable', 'date'],
            'appointment_request_id' => ['nullable', 'exists:appointment_requests,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
