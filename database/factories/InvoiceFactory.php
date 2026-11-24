<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        return [
            'invoice_number' => 'INV-'.now()->format('Ym').'-'.$this->faker->unique()->numberBetween(1000, 9999),
            'patient_id' => Patient::factory(),
            'visit_id' => null,
            'subtotal' => 500.00,
            'discount_amount' => 0.00,
            'discount_type' => 'fixed',
            'tax_amount' => 0.00,
            'total_amount' => 500.00,
            'paid_amount' => 0.00,
            'due_amount' => 500.00,
            'status' => 'unpaid',
            'invoice_date' => now()->toDateString(),
            'notes' => 'General patient consultation invoice',
            'created_by' => User::factory(),
        ];
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'paid_amount' => 500.00,
            'due_amount' => 0.00,
            'status' => 'paid',
        ]);
    }

    public function partiallyPaid(): static
    {
        return $this->state(fn () => [
            'paid_amount' => 200.00,
            'due_amount' => 300.00,
            'status' => 'partially_paid',
        ]);
    }
}
