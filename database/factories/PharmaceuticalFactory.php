<?php

namespace Database\Factories;

use App\Models\Pharmaceutical;
use Illuminate\Database\Eloquent\Factories\Factory;

class PharmaceuticalFactory extends Factory
{
    protected $model = Pharmaceutical::class;

    public function definition(): array
    {
        return [
            'generic_name' => fake()->randomElement(['Paracetamol', 'Omeprazole', 'Amoxicillin', 'Azithromycin', 'Cetirizine', 'Metformin']),
            'brand_name' => fake()->unique()->word(),
            'dosage_form' => fake()->randomElement(['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops']),
            'strength' => fake()->randomElement(['500mg', '20mg', '250mg/5ml', '10mg', '1g']),
            'manufacturer' => fake()->company(),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
