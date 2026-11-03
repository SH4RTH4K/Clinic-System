<?php

namespace Database\Seeders;

use App\Models\ClinicSetting;
use App\Models\PatientNumberingProfile;
use Illuminate\Database\Seeder;

class PatientNumberingProfileSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = ClinicSetting::query()->first();

        PatientNumberingProfile::query()->firstOrCreate(
            ['name' => 'General'],
            [
                'category' => 'General',
                'prefix' => $settings?->patient_no_series ?? 'A',
                'number_padding' => 0,
                'starting_number' => $settings?->patient_no_next ?? 1,
                'is_active' => true,
                'is_default' => true,
            ],
        );
    }
}
