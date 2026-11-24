<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('inventory.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'new_quantity' => ['required', 'numeric', 'min:0'],
            'transaction_type' => ['required', 'in:adjustment,purchase,dispense,return,wastage'],
            'reason' => ['required', 'string', 'max:500'],
            'reference_number' => ['nullable', 'string', 'max:100'],
        ];
    }
}
