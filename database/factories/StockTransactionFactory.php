<?php

namespace Database\Factories;

use App\Models\MedicineBatch;
use App\Models\StockTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockTransaction>
 */
class StockTransactionFactory extends Factory
{
    protected $model = StockTransaction::class;

    public function definition(): array
    {
        return [
            'medicine_batch_id' => MedicineBatch::factory(),
            'transaction_type' => 'purchase',
            'quantity' => 20.00,
            'balance_after' => 20.00,
            'reference_number' => 'PO-'.$this->faker->numberBetween(1000, 9999),
            'performed_by' => User::factory(),
            'notes' => 'Initial stock intake',
        ];
    }
}
