<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateClinicSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'clinic_name_en' => ['required', 'string', 'max:255'],
            'clinic_name_bn' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string'],
            'visiting_hours' => ['nullable', 'string'],
            'prescription_header_image' => ['nullable', 'string'],
            'footer_text' => ['nullable', 'string', 'max:255'],
            'about_text' => ['nullable', 'string', 'max:5000'],
            'about_text_bn' => ['nullable', 'string', 'max:5000'],
            'developer_name' => ['nullable', 'string', 'max:255'],
            'developer_link' => ['nullable', 'url', 'max:255'],
            'visiting_hours_schedule' => ['nullable', 'array'],
            'visiting_hours_schedule.mode' => ['nullable', 'string', 'in:no_hours,always_open,permanently_closed,temporarily_closed,selected_hours'],
            'visiting_hours_schedule.days' => ['nullable', 'array'],
        ];
    }
}
