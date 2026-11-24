<?php

namespace Database\Seeders;

use App\Models\LabInvestigation;
use Illuminate\Database\Seeder;

class LabInvestigationSeeder extends Seeder
{
    public function run(): void
    {
        $tests = [
            ['name' => 'Complete Blood Count (CBC) with ESR', 'category' => 'hematology', 'default_instructions' => 'No special preparation needed.'],
            ['name' => 'Hemoglobin (Hb%)', 'category' => 'hematology', 'default_instructions' => 'Routine venous blood test.'],
            ['name' => 'Blood Grouping & Rh Factor', 'category' => 'hematology', 'default_instructions' => 'Routine blood test.'],
            ['name' => 'Random Blood Sugar (RBS)', 'category' => 'biochemistry', 'default_instructions' => 'Can be done at any time.'],
            ['name' => 'Fasting Blood Sugar (FBS)', 'category' => 'biochemistry', 'default_instructions' => '8-10 hours overnight fasting required.'],
            ['name' => 'HbA1c (Glycated Hemoglobin)', 'category' => 'biochemistry', 'default_instructions' => 'No fasting required.'],
            ['name' => 'Serum Creatinine', 'category' => 'biochemistry', 'default_instructions' => 'Assesses renal function.'],
            ['name' => 'Serum Uric Acid', 'category' => 'biochemistry', 'default_instructions' => 'Assesses hyperuricemia/gout.'],
            ['name' => 'Lipid Profile (Cholesterol, TG, HDL, LDL)', 'category' => 'biochemistry', 'default_instructions' => '10-12 hours fasting required.'],
            ['name' => 'Liver Function Test (SGPT/ALT, SGOT/AST, Bilirubin)', 'category' => 'biochemistry', 'default_instructions' => 'Assesses hepatic profile.'],
            ['name' => 'Serum Electrolytes (Na+, K+, Cl-)', 'category' => 'biochemistry', 'default_instructions' => 'Routine electrolyte assessment.'],
            ['name' => 'Serum TSH (Thyroid Stimulating Hormone)', 'category' => 'biochemistry', 'default_instructions' => 'Early morning sample preferred.'],
            ['name' => 'Urine Routine & Microscopic Examination (R/M/E)', 'category' => 'microbiology', 'default_instructions' => 'Clean-catch midstream urine sample.'],
            ['name' => 'Urine Culture & Sensitivity (C/S)', 'category' => 'microbiology', 'default_instructions' => 'Sterile midstream sample before starting antibiotics.'],
            ['name' => 'Stool Routine & Microscopic Examination', 'category' => 'microbiology', 'default_instructions' => 'Fresh sample in clean container.'],
            ['name' => 'X-Ray Chest P/A View', 'category' => 'radiology', 'default_instructions' => 'Remove metallic jewelry before exposure.'],
            ['name' => 'X-Ray Lumbo-sacral Spine (A/P & Lat)', 'category' => 'radiology', 'default_instructions' => 'Standard lumbar spine radiography.'],
            ['name' => 'Ultrasonography (USG) of Whole Abdomen', 'category' => 'ultrasound', 'default_instructions' => 'Overnight fasting and full bladder required.'],
            ['name' => 'Ultrasonography (USG) of KUB & Prostate', 'category' => 'ultrasound', 'default_instructions' => 'Full bladder required.'],
            ['name' => 'Electrocardiogram (ECG - 12 Lead)', 'category' => 'other', 'default_instructions' => 'Rest for 5 minutes prior to recording.'],
        ];

        foreach ($tests as $test) {
            LabInvestigation::firstOrCreate(
                ['name' => $test['name']],
                [
                    ...$test,
                    'is_active' => true,
                ]
            );
        }
    }
}
