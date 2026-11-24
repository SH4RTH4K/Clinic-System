<?php

namespace Database\Factories;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Doctor>
 */
class DoctorFactory extends Factory
{
    protected $model = Doctor::class;

    public function definition(): array
    {
        return [
            'name' => 'Dr. '.fake()->name(),
            'name_bn' => 'ডা. '.fake()->name(),
            'credentials' => 'BHMS, DHMS',
            'specialty' => 'Homeopathy & General Practice',
            'bio' => fake()->paragraph(),
            'phone' => '0171'.fake()->numerify('#######'),
            'email' => fake()->safeEmail(),
            'is_active' => true,
            'sort_order' => 0,
            'user_id' => User::factory(),
        ];
    }
}
