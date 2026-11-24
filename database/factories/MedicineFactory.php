<?php

namespace Database\Factories;

use App\Models\Medicine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Medicine>
 */
class MedicineFactory extends Factory
{
    protected $model = Medicine::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->words(2, true),
            'potency' => $this->faker->randomElement(['6C', '30C', '200C', '1M', '10M', 'Q']),
            'form' => $this->faker->randomElement(['drops', 'pills', 'liquid']),
            'default_instruction' => 'Take 4 drops in water twice daily.',
            'stock_qty' => 10,
            'is_active' => true,
        ];
    }
}
