<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'payment_number' => 'PAY-'.now()->format('Ym').'-'.$this->faker->unique()->numberBetween(1000, 9999),
            'invoice_id' => Invoice::factory(),
            'payment_method' => 'cash',
            'amount' => 500.00,
            'transaction_reference' => null,
            'payment_date' => now()->toDateString(),
            'received_by' => User::factory(),
            'notes' => 'Cash received at counter',
        ];
    }
}
