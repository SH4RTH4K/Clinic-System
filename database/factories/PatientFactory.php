<?php

namespace Database\Factories;

use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        static $counter = 1;

        return [
            'patient_no' => $counter++,
            'patient_series' => 'T',
            'name' => fake()->name(),
            'guardian_name' => null,
            'gender' => fake()->randomElement(['male', 'female']),
            'age_years' => fake()->numberBetween(1, 90),
            'dob' => null,
            'phone' => '01711'.fake()->numerify('#######'),
            'address' => null,
            'blood_group' => null,
            'known_allergies' => null,
            'referred_by' => null,
            'created_by' => null,
        ];
    }
}
