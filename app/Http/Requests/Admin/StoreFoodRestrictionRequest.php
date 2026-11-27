<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFoodRestrictionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('food_restrictions.create') === true
            || $this->user()?->can('settings.create') === true;
    }

    public function rules(): array
    {
        return [
            'text_bn' => ['required', 'string', 'max:500'],
            'text_en' => ['nullable', 'string', 'max:500'],
            'category' => ['nullable', 'string', Rule::in(['general', 'homeopathic_antidote', 'sour_cold', 'spicy_oily', 'allergic_histamine', 'chronic_metabolic'])],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ];
    }

    public function messages(): array
    {
        return [
            'text_bn.required' => 'খাদ্য বা পথ্য নিষেধের বিবরণ (বাংলা) আবশ্যক।',
            'category.in' => 'সঠিক ক্যাটাগরি নির্বাচন করুন।',
        ];
    }
}
