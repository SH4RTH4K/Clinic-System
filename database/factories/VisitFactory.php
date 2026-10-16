<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Visit>
 */
class VisitFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'visit_date' => fake()->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'age_at_visit' => fake()->numberBetween(1, 90),
            'age_months' => fake()->numberBetween(0, 11),
            'age_days' => fake()->numberBetween(0, 30),
            'chief_complaint' => fake()->sentence(),
            'bp_symptoms_notes' => null,
            'diagnosis_notes' => null,
            'follow_up_date' => null,
            'status' => 'draft',
            'created_by' => null,
        ];
    }

    /** Create a finalized visit. */
    public function finalized(): static
    {
        return $this->state(['status' => 'finalized']);
    }
}
