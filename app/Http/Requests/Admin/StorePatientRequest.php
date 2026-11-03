<?php

namespace App\Http\Requests\Admin;

class StorePatientRequest extends PatientDataRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('patients.create') ?? false;
    }
}
