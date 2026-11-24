<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSmsSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin') || $this->user()?->can('communications.manage');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'sms_enabled' => ['required', 'boolean'],
            'sms_provider' => ['required', 'string', 'in:log,generic_http,greenweb,mimsms'],
            'api_url' => ['nullable', 'string', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:255'],
            'sender_id' => ['nullable', 'string', 'max:50'],
            'auto_sms_appointments' => ['required', 'boolean'],
            'auto_sms_queue' => ['required', 'boolean'],
            'auto_sms_prescriptions' => ['required', 'boolean'],
            'templates' => ['nullable', 'array'],
            'templates.appointment_confirmed' => ['nullable', 'string', 'max:500'],
            'templates.queue_token_issued' => ['nullable', 'string', 'max:500'],
            'templates.prescription_ready' => ['nullable', 'string', 'max:500'],
        ];
    }
}
