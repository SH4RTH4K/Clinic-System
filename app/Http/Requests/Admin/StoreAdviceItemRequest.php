<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdviceItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('advice_items.create') === true
            || $this->user()?->can('settings.create') === true;
    }

    public function rules(): array
    {
        return [
            'text_bn' => ['required', 'string', 'max:500'],
            'text_en' => ['nullable', 'string', 'max:500'],
            'category' => ['nullable', 'string', Rule::in(['general', 'homeopathic', 'diet', 'lifestyle', 'hygiene', 'warning'])],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ];
    }

    public function messages(): array
    {
        return [
            'text_bn.required' => 'পরামর্শের বিবরণ (বাংলা) আবশ্যক।',
            'category.required' => 'পরামর্শের ক্যাটাগরি নির্বাচন করুন।',
        ];
    }
}
