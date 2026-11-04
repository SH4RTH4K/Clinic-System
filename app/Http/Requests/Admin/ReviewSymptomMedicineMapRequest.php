<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ReviewSymptomMedicineMapRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('symptom_medicine_map.review') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', 'string', 'in:approved,rejected,inactive'],
            'review_note' => ['nullable', 'string', 'max:2000', 'required_if:decision,rejected', 'required_if:decision,inactive'],
            'review_acknowledged' => ['sometimes', 'accepted', 'required_if:decision,approved'],
        ];
    }
}
