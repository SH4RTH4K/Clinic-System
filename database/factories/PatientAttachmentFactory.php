<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\PatientAttachment;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatientAttachment>
 */
class PatientAttachmentFactory extends Factory
{
    protected $model = PatientAttachment::class;

    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'visit_id' => Visit::factory(),
            'title' => fake()->words(3, true).' Report',
            'category' => fake()->randomElement(['lab_report', 'xray_radiology', 'prescription', 'discharge_summary', 'other']),
            'file_path' => 'attachments/test_report.pdf',
            'file_name' => 'test_report.pdf',
            'mime_type' => 'application/pdf',
            'file_size_bytes' => fake()->numberBetween(10240, 2097152),
            'notes' => fake()->optional()->sentence(),
            'uploaded_by' => User::factory(),
        ];
    }
}
