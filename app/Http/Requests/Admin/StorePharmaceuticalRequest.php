<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePharmaceuticalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('pharmaceuticals.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'generic_name' => ['required', 'string', 'max:255'],
            'brand_name' => ['required', 'string', 'max:255'],
            'dosage_form' => ['required', 'string', 'max:50'],
            'strength' => ['required', 'string', 'max:100'],
            'manufacturer' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],

            // Optional atomic initial batch intake
            'receive_initial_batch' => ['nullable', 'boolean'],
            'batch_number' => ['nullable', 'string', 'max:100'],
            'expiry_date' => ['nullable', 'date'],
            'purchase_price' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'initial_quantity' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'reorder_level' => ['nullable', 'numeric', 'min:0'],
            'supplier_name' => ['nullable', 'string', 'max:150'],
        ];
    }
}
