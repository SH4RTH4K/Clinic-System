<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PreviewSymptomMedicineMapImportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('symptom_medicine_map.create') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'csv_file' => ['required', 'file', 'max:5120', 'mimes:csv,txt', function (string $attribute, mixed $value, \Closure $fail): void {
                if ($value->getClientOriginalExtension() !== 'csv') {
                    $fail('Upload a CSV file with the .csv extension.');
                }
            }],
        ];
    }
}
