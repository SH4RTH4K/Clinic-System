<?php

namespace App\Http\Requests\Admin;

use App\Models\SymptomMedicineMap;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateSymptomMedicineMapRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('symptom_medicine_map.update') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'symptom_id' => $this->referenceRule('symptoms', 'symptom_id'),
            'medicine_id' => $this->referenceRule('medicines', 'medicine_id'),
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
     * @return array<int, mixed>
     */
    private function referenceRule(string $table, string $field): array
    {
        /** @var SymptomMedicineMap|null $mapping */
        $mapping = $this->route('symptom_medicine_map');
        $currentId = $mapping?->{$field};
        $selectedId = $this->integer($field);
        $existsRule = Rule::exists($table, 'id');

        if ($selectedId !== (int) $currentId) {
            $existsRule->where('is_active', true);
        }

        return ['required', 'integer', $existsRule];
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

            /** @var SymptomMedicineMap $mapping */
            $mapping = $this->route('symptom_medicine_map');
            $symptomId = $this->integer('symptom_id');
            $medicineId = $this->integer('medicine_id');

            if ($symptomId === (int) $mapping->symptom_id && $medicineId === (int) $mapping->medicine_id) {
                return;
            }

            $duplicateExists = SymptomMedicineMap::query()
                ->where('symptom_id', $symptomId)
                ->where('medicine_id', $medicineId)
                ->where('id', '!=', $mapping->id)
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
