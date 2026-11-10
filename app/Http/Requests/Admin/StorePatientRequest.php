<?php

namespace App\Http\Requests\Admin;

class StorePatientRequest extends PatientDataRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->can('patients.create')
            && (! $this->filled('appointment_request_id')
                || $user->hasRole('Super Admin')
                || $user->can('appointments.update'));
    }
}
