<?php

namespace App\Http\Requests\Admin;

use App\Models\Patient;

class UpdatePatientRequest extends PatientDataRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('patients.update') ?? false;
    }

    /** @return list<string> */
    protected function allowedRelationshipValues(): array
    {
        $allowedValues = parent::allowedRelationshipValues();
        $patient = $this->route('patient');

        if ($patient instanceof Patient && $this->input('guardian_relationship') === $patient->guardian_relationship) {
            $allowedValues[] = $patient->guardian_relationship;
        }

        return array_values(array_unique($allowedValues));
    }
}
