<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceItem>
 */
class InvoiceItemFactory extends Factory
{
    protected $model = InvoiceItem::class;

    public function definition(): array
    {
        return [
            'invoice_id' => Invoice::factory(),
            'item_type' => 'consultation',
            'item_name' => 'Doctor Consultation Fee',
            'quantity' => 1.00,
            'unit_price' => 500.00,
            'total_price' => 500.00,
            'medicine_batch_id' => null,
            'notes' => null,
        ];
    }
}
