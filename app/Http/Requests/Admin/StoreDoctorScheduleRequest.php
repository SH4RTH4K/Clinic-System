<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDoctorScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin') || $this->user()?->can('calendar.manage');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'schedules' => ['required', 'array'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'schedules.*.start_time' => ['required', 'string'],
            'schedules.*.end_time' => ['required', 'string'],
            'schedules.*.chamber_no' => ['nullable', 'string', 'max:100'],
            'schedules.*.slot_duration_minutes' => ['required', 'integer', 'min:5', 'max:120'],
            'schedules.*.max_patients' => ['nullable', 'integer', 'min:1', 'max:500'],
            'schedules.*.is_active' => ['required', 'boolean'],
        ];
    }
}
