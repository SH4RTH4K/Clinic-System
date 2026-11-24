<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('billing.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'invoice_date' => ['required', 'date'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'discount_type' => ['nullable', 'in:fixed,percentage'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', 'in:consultation,medicine,investigation,procedure,other'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.medicine_batch_id' => ['nullable', 'exists:medicine_batches,id'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
