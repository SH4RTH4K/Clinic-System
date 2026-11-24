<?php

namespace App\Http\Requests\Admin;

use App\Models\ClinicSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active === true
            && $this->user()?->can('clinical_records.view') === true
            && $this->user()?->can('visits.create') === true;
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
            'token_id' => 'nullable|integer|exists:patient_queue_tokens,id',
            'redirect_to' => 'nullable|string|in:index,show',
            'sync_diagnosis_to_medical_history' => 'nullable|boolean',
            'doctor_id' => ['prohibited'],
            'visit_date' => 'required|date|before_or_equal:today',
            'age_at_visit' => 'nullable|integer|min:0|max:150',
            'age_months' => 'nullable|integer|min:0|max:11',
            'age_days' => 'nullable|integer|min:0|max:31',
            'patient_dob' => 'nullable|date|before_or_equal:today',
            'chief_complaint' => 'required|string|max:5000',
            'bp_symptoms_notes' => 'nullable|string|max:5000',
            'diagnosis_notes' => 'nullable|string|max:5000',
            'provisional_diagnosis' => 'nullable|string|max:255',
            'final_diagnosis' => 'nullable|string|max:255',
            'physical_generals' => 'nullable|array',
            'physical_generals.thermal_state' => 'nullable|string|in:chilly,hot,ambithermal',
            'physical_generals.thirst' => 'nullable|string|max:100',
            'physical_generals.food_cravings' => 'nullable|array',
            'physical_generals.food_cravings.*' => 'string|max:100',
            'physical_generals.food_aversions' => 'nullable|array',
            'physical_generals.food_aversions.*' => 'string|max:100',
            'physical_generals.sleep_dreams' => 'nullable|string|max:2000',
            'physical_generals.sweat' => 'nullable|string|max:100',
            'physical_generals.tongue' => 'nullable|string|max:100',
            'physical_generals.modalities_aggravation' => 'nullable|string|max:2000',
            'physical_generals.modalities_amelioration' => 'nullable|string|max:2000',
            'physical_generals.mind_disposition' => 'nullable|string|max:2000',
            'vitals' => 'nullable|array',
            'vitals.bp_systolic' => 'nullable|integer|min:30|max:300',
            'vitals.bp_diastolic' => 'nullable|integer|min:20|max:200',
            'vitals.pulse_rate' => 'nullable|integer|min:20|max:300',
            'vitals.temperature_f' => 'nullable|numeric|min:80|max:115',
            'vitals.respiratory_rate' => 'nullable|integer|min:5|max:100',
            'vitals.spo2' => 'nullable|integer|min:40|max:100',
            'vitals.weight_kg' => 'nullable|numeric|min:0.5|max:500',
            'vitals.height_cm' => 'nullable|numeric|min:20|max:300',
            'vitals.bmi' => 'nullable|numeric|min:5|max:120',
            'vitals.blood_sugar_rbs' => 'nullable|numeric|min:0.5|max:60',
            'vitals.blood_sugar_fbs' => 'nullable|numeric|min:0.5|max:60',
            'vitals.notes' => 'nullable|string|max:1000',
            'follow_up_date' => 'nullable|date|after_or_equal:visit_date',
            'symptoms' => 'nullable|array',
            'symptoms.*' => 'integer|exists:symptoms,id',
            'advice_items' => 'nullable|array',
            'advice_items.*' => 'integer|exists:advice_items,id',
            'food_restrictions' => 'nullable|array',
            'food_restrictions.*' => 'integer|exists:food_restrictions,id',
            'lab_investigations' => 'nullable|array',
            'lab_investigations.*.lab_investigation_id' => 'nullable|integer|exists:lab_investigations,id',
            'lab_investigations.*.test_name' => 'required|string|max:255',
            'lab_investigations.*.instructions' => 'nullable|string|max:500',
            'lab_investigations.*.status' => ['nullable', 'string', Rule::in(['ordered', 'completed', 'cancelled'])],
            'prescription_items' => 'nullable|array',
            'prescription_items.*.item_type' => ['nullable', 'string', Rule::in(['remedy', 'pharmaceutical'])],
            'prescription_items.*.medicine_id' => 'nullable|integer|exists:medicines,id',
            'prescription_items.*.pharmaceutical_id' => 'nullable|integer|exists:pharmaceuticals,id',
            'prescription_items.*.brand_name' => 'nullable|string|max:255',
            'prescription_items.*.generic_name' => 'nullable|string|max:255',
            'prescription_items.*.strength' => 'nullable|string|max:100',
            'prescription_items.*.dosage_form' => 'nullable|string|max:50',
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
