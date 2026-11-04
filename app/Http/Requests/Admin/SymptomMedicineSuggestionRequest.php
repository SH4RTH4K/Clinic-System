<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SymptomMedicineSuggestionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('clinical_records.view') === true
            && $this->user()?->can('visits.view') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'symptoms' => ['sometimes', 'array', 'max:10'],
            'symptoms.*' => ['required', 'integer', 'distinct', Rule::exists('symptoms', 'id')->where('is_active', true)],
        ];
    }
}
