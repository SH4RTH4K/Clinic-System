<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreMedicineBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('inventory.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'item_type' => ['required', 'in:remedy,pharmaceutical'],
            'medicine_id' => ['nullable', 'required_if:item_type,remedy', 'exists:medicines,id'],
            'pharmaceutical_id' => ['nullable', 'required_if:item_type,pharmaceutical', 'exists:pharmaceuticals,id'],
            'batch_number' => ['required', 'string', 'max:100'],
            'potency' => ['nullable', 'string', 'max:50'],
            'form' => ['nullable', 'string', 'max:100'],
            'expiry_date' => ['nullable', 'date'],
            'purchase_date' => ['nullable', 'date'],
            'purchase_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'initial_quantity' => ['required', 'numeric', 'min:0'],
            'unit' => ['required', 'string', 'max:50'],
            'reorder_level' => ['required', 'numeric', 'min:0'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'purchase_invoice' => ['nullable', 'string', 'max:100'],
        ];
    }
}
