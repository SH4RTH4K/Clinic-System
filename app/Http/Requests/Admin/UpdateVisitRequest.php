<?php

namespace App\Http\Requests\Admin;

use App\Models\ClinicSetting;
use App\Models\Visit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Visit $visit */
        $visit = $this->route('visit');

        // Finalized visits require the elevated 'visits.amend' permission
        if ($visit && $visit->status === 'finalized') {
            return $this->user()->can('visits.amend');
        }

        return $this->user()->can('visits.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $settings = ClinicSetting::first();
        $timingKeys = $settings
            ? collect($settings->getPrescriptionConfig()['timing_options'] ?? [])->pluck('key')->filter()->all()
            : [];
        if (empty($timingKeys)) {
            $timingKeys = ['morning', 'noon', 'afternoon', 'night', 'bedtime'];
        }

        return [
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'visit_date' => 'required|date|before_or_equal:today',
            'age_at_visit' => 'nullable|integer|min:0|max:150',
            'age_months' => 'nullable|integer|min:0|max:11',
            'age_days' => 'nullable|integer|min:0|max:31',
            'patient_dob' => 'nullable|date|before_or_equal:today',
            'chief_complaint' => 'required|string|max:5000',
            'bp_symptoms_notes' => 'nullable|string|max:5000',
            'diagnosis_notes' => 'nullable|string|max:5000',
            'follow_up_date' => 'nullable|date|after_or_equal:visit_date',
            'status' => 'required|in:draft,finalized',
            'symptoms' => 'nullable|array',
            'symptoms.*' => 'integer|exists:symptoms,id',
            'advice_items' => 'nullable|array',
            'advice_items.*' => 'integer|exists:advice_items,id',
            'food_restrictions' => 'nullable|array',
            'food_restrictions.*' => 'integer|exists:food_restrictions,id',
            'prescription_items' => 'nullable|array',
            'prescription_items.*.medicine_id' => 'required|integer|exists:medicines,id',
            'prescription_items.*.timing' => 'required|array|min:1',
            'prescription_items.*.timing.*' => ['required', 'string', Rule::in($timingKeys)],
            'prescription_items.*.before_after' => 'required|string|max:50',
            'prescription_items.*.dose_qty' => 'required|numeric|min:0.1|max:100',
            'prescription_items.*.dose_unit' => 'required|string|max:50',
            'prescription_items.*.dilution_note' => 'nullable|string|max:255',
            'prescription_items.*.duration_days' => 'nullable|integer|min:1|max:365',
        ];
    }
}
