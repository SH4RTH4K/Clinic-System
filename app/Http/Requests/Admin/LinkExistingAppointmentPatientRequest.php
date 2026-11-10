<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LinkExistingAppointmentPatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && ($user->hasRole('Super Admin')
                || ($user->can('appointments.update') && $user->can('patients.view')));
    }

    /** @return array<string, array<int, string|ValidationRule>> */
    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')],
        ];
    }
}
