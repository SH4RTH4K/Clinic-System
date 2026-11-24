<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PatientVital;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClinicalVitalsAndCaseTakingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'visits.view',
            'visits.create',
            'visits.update',
            'visits.finalize',
            'visits.export',
            'clinical_records.view',
            'doctors.view',
            'patients.view',
            'patients.create',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo($permissions);

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'doctor_name' => 'Dr. Homeopath',
            'doctor_credentials' => 'BHMS, MD',
            'phone' => '+8801700000000',
            'address' => 'Dhaka, Bangladesh',
            'practice_type' => 'integrative_dual',
        ]);
    }

    public function test_bmi_and_blood_pressure_categories_calculation(): void
    {
        // 1. BMI calculation
        $bmi = PatientVital::calculateBmi(70, 175);
        $this->assertSame(22.9, $bmi);

        // 2. BMI category accessors
        $underweightVital = new PatientVital(['bmi' => 17.5]);
        $this->assertSame('Underweight', $underweightVital->bmi_category);

        $normalVital = new PatientVital(['bmi' => 22.9]);
        $this->assertSame('Normal', $normalVital->bmi_category);

        $overweightVital = new PatientVital(['bmi' => 27.2]);
        $this->assertSame('Overweight', $overweightVital->bmi_category);

        $obeseVital = new PatientVital(['bmi' => 32.5]);
        $this->assertSame('Obese', $obeseVital->bmi_category);

        // 3. Blood Pressure category accessors
        $normalBp = new PatientVital(['bp_systolic' => 118, 'bp_diastolic' => 76]);
        $this->assertSame('Normal', $normalBp->blood_pressure_category);
        $this->assertSame('118/76 mmHg', $normalBp->blood_pressure_formatted);

        $stage1Bp = new PatientVital(['bp_systolic' => 134, 'bp_diastolic' => 84]);
        $this->assertSame('Stage 1 HTN', $stage1Bp->blood_pressure_category);

        $stage2Bp = new PatientVital(['bp_systolic' => 146, 'bp_diastolic' => 92]);
        $this->assertSame('Stage 2 HTN', $stage2Bp->blood_pressure_category);

        $crisisBp = new PatientVital(['bp_systolic' => 190, 'bp_diastolic' => 125]);
        $this->assertSame('Crisis', $crisisBp->blood_pressure_category);
    }

    public function test_doctor_creates_visit_with_structured_vitals_and_physical_generals(): void
    {
        $doctorUser = User::factory()->create(['is_active' => true]);
        $doctorUser->assignRole('Doctor');

        $doctorProfile = Doctor::create([
            'user_id' => $doctorUser->id,
            'name' => 'Dr. Rahman BHMS',
            'degrees' => 'BHMS',
            'is_active' => true,
        ]);

        $patient = Patient::factory()->create();
        $remedy = Medicine::create([
            'name' => 'Arsenicum Album',
            'potency' => '200CH',
            'form' => 'drops',
            'is_active' => true,
        ]);

        $payload = [
            'patient_id' => $patient->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Asthmatic dyspnea aggravated after midnight',
            'bp_symptoms_notes' => 'Patient restless, prostration out of proportion',
            'provisional_diagnosis' => 'Bronchial Asthma',
            'final_diagnosis' => 'Asthma bronchiale with anxiety',
            'status' => 'draft',
            'vitals' => [
                'bp_systolic' => 130,
                'bp_diastolic' => 85,
                'pulse_rate' => 92,
                'temperature_f' => 99.2,
                'respiratory_rate' => 24,
                'spo2' => 96,
                'weight_kg' => 64.0,
                'height_cm' => 168.0,
                'bmi' => 22.7,
                'blood_sugar_rbs' => 6.2,
                'notes' => 'Wheezing on bilateral expiratory auscultation',
            ],
            'physical_generals' => [
                'thermal_state' => 'chilly',
                'thirst' => 'Small quantity frequently (অল্প পানি বারবার)',
                'food_cravings' => ['গরম খাবার (Warm Food)', 'টক (Sour)'],
                'food_aversions' => ['চর্বি (Fat)'],
                'tongue' => 'Clean & Pink (স্বাভাবিক)',
                'sweat' => 'Head Sweat in Sleep (মাথায় ঘাম)',
                'sleep_dreams' => 'Restless after midnight, anxious dreams',
                'modalities_aggravation' => 'Midnight (1-2 AM), Cold air, cold drinks',
                'modalities_amelioration' => 'Warm drinks, sitting erect, wrapping up warmly',
                'mind_disposition' => 'Great anguish, fear of death, extreme restlessness',
            ],
            'prescription_items' => [
                [
                    'item_type' => 'remedy',
                    'medicine_id' => $remedy->id,
                    'timing' => ['morning', 'night'],
                    'before_after' => 'before_meal',
                    'dose_qty' => 4,
                    'dose_unit' => 'drops',
                    'dilution_note' => 'with half a cup of water',
                    'duration_days' => 7,
                ],
            ],
        ];

        $response = $this->actingAs($doctorUser)
            ->post(route('admin.visits.store'), $payload);

        $response->assertRedirect(route('admin.visits.index'));

        $visit = Visit::where('patient_id', $patient->id)->firstOrFail();

        // 1. Verify physical_generals cast on Visit
        $this->assertIsArray($visit->physical_generals);
        $this->assertSame('chilly', $visit->physical_generals['thermal_state']);
        $this->assertSame('Small quantity frequently (অল্প পানি বারবার)', $visit->physical_generals['thirst']);
        $this->assertContains('গরম খাবার (Warm Food)', $visit->physical_generals['food_cravings']);

        // 2. Verify PatientVital record in database
        $this->assertDatabaseHas('patient_vitals', [
            'visit_id' => $visit->id,
            'patient_id' => $patient->id,
            'bp_systolic' => 130,
            'bp_diastolic' => 85,
            'pulse_rate' => 92,
            'temperature_f' => 99.2,
            'spo2' => 96,
            'weight_kg' => 64.0,
            'height_cm' => 168.0,
            'bmi' => 22.7,
            'blood_sugar_rbs' => 6.2,
        ]);

        $this->assertNotNull($visit->vital);
        $this->assertSame(130, $visit->vital->bp_systolic);
        $this->assertSame(85, $visit->vital->bp_diastolic);
        $this->assertSame('Stage 1 HTN', $visit->vital->blood_pressure_category);

        // 3. Verify Visit Show view contains vitals
        $showResponse = $this->actingAs($doctorUser)
            ->get(route('admin.visits.show', $visit));

        $showResponse->assertOk();

        // 4. Finalize the visit
        $finalizeResponse = $this->actingAs($doctorUser)
            ->post(route('admin.visits.finalize_draft', $visit), $payload);

        $finalizeResponse->assertRedirect(route('admin.visits.show', $visit));

        // 5. Verify Prescription PDF generation
        $pdfResponse = $this->actingAs($doctorUser)
            ->get(route('admin.visits.pdf', $visit));

        $pdfResponse->assertOk();
        $this->assertSame('application/pdf', $pdfResponse->headers->get('Content-Type'));
    }

    public function test_patient_show_displays_longitudinal_vitals_history(): void
    {
        $doctorUser = User::factory()->create(['is_active' => true]);
        $doctorUser->assignRole('Doctor');

        $doctorProfile = Doctor::create([
            'user_id' => $doctorUser->id,
            'name' => 'Dr. Rahman BHMS',
            'degrees' => 'BHMS',
            'is_active' => true,
        ]);

        $patient = Patient::factory()->create();

        // Create 2 vitals entries across 2 visits
        $vital1 = PatientVital::factory()->create([
            'patient_id' => $patient->id,
            'weight_kg' => 72.5,
            'bp_systolic' => 135,
            'bp_diastolic' => 88,
        ]);

        $vital2 = PatientVital::factory()->create([
            'patient_id' => $patient->id,
            'weight_kg' => 70.0,
            'bp_systolic' => 122,
            'bp_diastolic' => 80,
        ]);

        $response = $this->actingAs($doctorUser)
            ->get(route('admin.patients.show', $patient));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Patients/Show')
            ->has('patient.vitals_history', 2)
        );
    }
}
