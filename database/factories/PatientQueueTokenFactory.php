<?php

namespace Database\Factories;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatientQueueToken>
 */
class PatientQueueTokenFactory extends Factory
{
    protected $model = PatientQueueToken::class;

    public function definition(): array
    {
        $num = fake()->numberBetween(1, 99);

        return [
            'token_number' => $num,
            'token_code' => sprintf('T-%03d', $num),
            'token_date' => Carbon::today(),
            'patient_id' => Patient::factory(),
            'patient_name' => fake()->name(),
            'patient_phone' => '0171'.fake()->numerify('#######'),
            'doctor_id' => Doctor::factory(),
            'service_room' => 'Chamber 1',
            'priority' => 'normal',
            'status' => 'waiting',
            'called_at' => null,
            'started_at' => null,
            'completed_at' => null,
            'notes' => null,
        ];
    }

    public function calling(): static
    {
        return $this->state(fn () => [
            'status' => 'calling',
            'called_at' => Carbon::now(),
        ]);
    }

    public function inConsultation(): static
    {
        return $this->state(fn () => [
            'status' => 'in_consultation',
            'called_at' => Carbon::now()->subMinutes(10),
            'started_at' => Carbon::now()->subMinutes(5),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => 'completed',
            'called_at' => Carbon::now()->subMinutes(20),
            'started_at' => Carbon::now()->subMinutes(15),
            'completed_at' => Carbon::now(),
        ]);
    }
}
