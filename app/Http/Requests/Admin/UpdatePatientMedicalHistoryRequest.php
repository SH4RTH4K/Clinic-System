<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientMedicalHistoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->is_active === true
            && ($user->hasRole('Super Admin')
                || $user->can('patients.update')
                || $user->can('clinical_records.view'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'medical_history' => ['nullable', 'string', 'max:5000'],
            'known_allergies' => ['nullable', 'string', 'max:1000'],
            'blood_group' => ['nullable', 'string', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
        ];
    }
}
