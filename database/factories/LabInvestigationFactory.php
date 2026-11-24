<?php

namespace Database\Factories;

use App\Models\LabInvestigation;
use Illuminate\Database\Eloquent\Factories\Factory;

class LabInvestigationFactory extends Factory
{
    protected $model = LabInvestigation::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(3, true),
            'category' => fake()->randomElement(['hematology', 'biochemistry', 'radiology', 'ultrasound', 'microbiology', 'other']),
            'default_instructions' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
