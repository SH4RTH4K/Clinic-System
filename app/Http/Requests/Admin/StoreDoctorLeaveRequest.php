<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDoctorLeaveRequest extends FormRequest
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
            'leave_date' => ['required', 'date'],
            'leave_date_end' => ['nullable', 'date', 'after_or_equal:leave_date'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
