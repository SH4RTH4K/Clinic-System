<?php

namespace App\Http\Requests\Admin;

use App\Models\ClinicSetting;
use App\Models\VisitDraft;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVisitDraftRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $payload = $this->input('payload');

        if (! is_array($payload) || ! array_key_exists('doctor_id', $payload)) {
            return;
        }

        unset($payload['doctor_id']);
        $this->merge(['payload' => $payload]);
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        $ownerToken = $this->input('owner_token');

        return $user !== null
            && $user->can('clinical_records.view')
            && $user->can('visits.create')
            && is_string($ownerToken)
            && hash_equals(VisitDraft::ownerTokenFor($user), $ownerToken);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $settings = ClinicSetting::first();
        $timingKeys = $settings
            ? collect($settings->getPrescriptionConfig()['timing_options'] ?? [])->pluck('key')->filter()->all()
            : [];

        if ($timingKeys === []) {
            $timingKeys = ['morning', 'noon', 'afternoon', 'night', 'bedtime'];
        }

        return [
            'owner_token' => ['required', 'string', 'size:64'],
            'payload' => ['required', 'array:patient_id,visit_date,age_at_visit,age_months,age_days,patient_dob,chief_complaint,bp_symptoms_notes,diagnosis_notes,follow_up_date,status,symptoms,prescription_items,advice_items,food_restrictions'],
            'payload.patient_id' => ['nullable', 'integer', 'exists:patients,id'],
            'payload.visit_date' => ['nullable', 'date'],
            'payload.age_at_visit' => ['nullable', 'integer', 'min:0', 'max:150'],
            'payload.age_months' => ['nullable', 'integer', 'min:0', 'max:11'],
            'payload.age_days' => ['nullable', 'integer', 'min:0', 'max:31'],
            'payload.patient_dob' => ['nullable', 'date'],
            'payload.chief_complaint' => ['nullable', 'string', 'max:5000'],
            'payload.bp_symptoms_notes' => ['nullable', 'string', 'max:5000'],
            'payload.diagnosis_notes' => ['nullable', 'string', 'max:5000'],
            'payload.follow_up_date' => ['nullable', 'date'],
            'payload.status' => ['nullable', Rule::in(['draft', 'finalized'])],
            'payload.symptoms' => ['sometimes', 'array'],
            'payload.symptoms.*' => ['integer', 'exists:symptoms,id'],
            'payload.prescription_items' => ['sometimes', 'array'],
            'payload.prescription_items.*' => ['array:medicine_id,timing,before_after,dose_qty,dose_unit,dilution_note,duration_days'],
            'payload.prescription_items.*.medicine_id' => ['nullable', 'integer', 'exists:medicines,id'],
            'payload.prescription_items.*.timing' => ['sometimes', 'array'],
            'payload.prescription_items.*.timing.*' => ['string', Rule::in($timingKeys)],
            'payload.prescription_items.*.before_after' => ['nullable', 'string', 'max:50'],
            'payload.prescription_items.*.dose_qty' => ['nullable', 'numeric', 'min:0.1', 'max:100'],
            'payload.prescription_items.*.dose_unit' => ['nullable', 'string', 'max:50'],
            'payload.prescription_items.*.dilution_note' => ['nullable', 'string', 'max:255'],
            'payload.prescription_items.*.duration_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'payload.advice_items' => ['sometimes', 'array'],
            'payload.advice_items.*' => ['integer', 'exists:advice_items,id'],
            'payload.food_restrictions' => ['sometimes', 'array'],
            'payload.food_restrictions.*' => ['integer', 'exists:food_restrictions,id'],
        ];
    }
}
