<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ImportMedicinesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('medicines.create') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:10240'],
            'duplicate_strategy' => ['required', 'string', 'in:skip,update,append'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Please select a CSV or JSON file to import.',
            'file.file' => 'The uploaded item must be a valid file.',
            'file.max' => 'The file size must not exceed 10MB.',
            'duplicate_strategy.required' => 'Please select a duplicate handling option.',
            'duplicate_strategy.in' => 'Invalid duplicate handling option selected.',
        ];
    }
}
