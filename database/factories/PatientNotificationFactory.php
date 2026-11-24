<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\PatientNotification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatientNotification>
 */
class PatientNotificationFactory extends Factory
{
    protected $model = PatientNotification::class;

    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'channel' => 'sms',
            'recipient_phone' => '0171'.fake()->numerify('#######'),
            'event_type' => 'custom_alert',
            'message_body' => fake()->sentence(8),
            'status' => 'sent',
            'gateway_provider' => 'log',
            'gateway_response' => 'Logged successfully',
            'sent_by' => User::factory(),
            'sent_at' => Carbon::now(),
        ];
    }

    public function whatsapp(): static
    {
        return $this->state(fn () => [
            'channel' => 'whatsapp',
            'gateway_provider' => 'whatsapp_click_to_chat',
            'gateway_response' => 'Shared via WhatsApp Click-to-Chat',
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn () => [
            'status' => 'failed',
            'gateway_response' => 'Gateway timeout or invalid recipient',
        ]);
    }
}
