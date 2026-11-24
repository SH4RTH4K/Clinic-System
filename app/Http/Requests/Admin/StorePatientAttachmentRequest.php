<?php

namespace App\Http\Requests\Admin;

use App\Models\Patient;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('attachments.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->route('patient')) {
            $patient = $this->route('patient');
            $this->merge([
                'patient_id' => $patient instanceof Patient ? $patient->id : $patient,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'exists:patients,id'],
            'visit_id' => ['nullable', 'exists:visits,id'],
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'in:lab_report,xray_radiology,prescription,discharge_summary,clinical_note,blood_test,x_ray,usg,mri,other'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
