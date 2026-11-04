<?php

namespace App\Http\Requests\Admin;

use App\Models\SymptomMedicineMap;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSymptomMedicineMapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('symptom_medicine_map.create') === true;
    }

    public function rules(): array
    {
        return [
            'symptom_id' => ['required', 'integer', Rule::exists('symptoms', 'id')->where('is_active', true)],
            'medicine_id' => ['required', 'integer', Rule::exists('medicines', 'id')->where('is_active', true)],
            'priority' => ['required', 'integer', 'min:1', 'max:9999'],
            'note' => ['nullable', 'string', 'max:5000'],
            'source_title' => ['nullable', 'string', 'max:255'],
            'source_author' => ['nullable', 'string', 'max:255'],
            'source_edition' => ['nullable', 'string', 'max:255'],
            'source_page' => ['nullable', 'string', 'max:100'],
            'source_url' => ['nullable', 'url', 'max:2048'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['symptom_id', 'medicine_id'])) {
                return;
            }

            $duplicateExists = SymptomMedicineMap::query()
                ->where('symptom_id', $this->integer('symptom_id'))
                ->where('medicine_id', $this->integer('medicine_id'))
                ->exists();

            if ($duplicateExists) {
                $validator->errors()->add('medicine_id', 'This symptom and medicine already have an active mapping.');
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'symptom_id.exists' => 'Select an active symptom.',
            'medicine_id.exists' => 'Select an active medicine.',
        ];
    }
}
