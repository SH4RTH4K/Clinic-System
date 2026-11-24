<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class RecordPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('billing.create') || $this->user()?->can('billing.update');
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,bkash,nagad,rocket,card,bank,other'],
            'transaction_reference' => ['nullable', 'string', 'max:100'],
            'payment_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
