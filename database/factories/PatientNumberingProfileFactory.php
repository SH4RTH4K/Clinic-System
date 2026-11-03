<?php

namespace Database\Factories;

use App\Models\PatientNumberingProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatientNumberingProfile>
 */
class PatientNumberingProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'category' => fake()->word(),
            'category_code' => fake()->unique()->lexify('???'),
            'prefix' => strtoupper(fake()->lexify('??')),
            'include_year' => false,
            'reset_annually' => false,
            'separator' => '-',
            'number_padding' => 4,
            'starting_number' => 1,
            'is_active' => true,
            'is_default' => false,
        ];
    }
}
