<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\VisitDraft;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VisitDraft>
 */
class VisitDraftFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'payload' => [
                'patient_id' => null,
                'chief_complaint' => '',
                'prescription_items' => [],
            ],
            'expires_at' => now()->addDays(7),
        ];
    }
}
