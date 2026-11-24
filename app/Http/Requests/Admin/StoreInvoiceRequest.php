<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('billing.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'exists:patients,id'],
            'visit_id' => ['nullable', 'exists:visits,id'],
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
            'initial_payment' => ['nullable', 'array'],
            'initial_payment.amount' => ['nullable', 'numeric', 'min:0'],
            'initial_payment.payment_method' => ['nullable', 'in:cash,bkash,nagad,rocket,card,bank,other'],
            'initial_payment.transaction_reference' => ['nullable', 'string', 'max:100'],
            'initial_payment.payment_date' => ['nullable', 'date'],
            'initial_payment.notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
