<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\PatientVital;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatientVital>
 */
class PatientVitalFactory extends Factory
{
    protected $model = PatientVital::class;

    public function definition(): array
    {
        $weight = fake()->randomFloat(1, 45, 95);
        $height = fake()->randomFloat(1, 150, 185);
        $bmi = PatientVital::calculateBmi($weight, $height);

        return [
            'patient_id' => Patient::factory(),
            'visit_id' => Visit::factory(),
            'bp_systolic' => fake()->numberBetween(110, 140),
            'bp_diastolic' => fake()->numberBetween(70, 90),
            'pulse_rate' => fake()->numberBetween(65, 85),
            'temperature_f' => fake()->randomFloat(1, 97.5, 99.5),
            'respiratory_rate' => fake()->numberBetween(14, 20),
            'spo2' => fake()->numberBetween(95, 100),
            'weight_kg' => $weight,
            'height_cm' => $height,
            'bmi' => $bmi,
            'blood_sugar_rbs' => fake()->randomFloat(1, 4.5, 9.0),
            'notes' => fake()->optional()->sentence(),
            'recorded_by' => User::factory(),
        ];
    }
}
