<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\LabInvestigation;
use App\Models\Patient;
use App\Models\Pharmaceutical;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DualPracticeModeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'clinic_settings.view',
            'clinic_settings.update',
            'pharmaceuticals.view',
            'pharmaceuticals.create',
            'pharmaceuticals.update',
            'pharmaceuticals.delete',
            'lab_investigations.view',
            'lab_investigations.create',
            'lab_investigations.update',
            'lab_investigations.delete',
            'visits.view',
            'visits.create',
            'visits.update',
            'visits.finalize',
            'visits.export',
            'clinical_records.view',
            'doctors.view',
            'doctors.create',
            'doctors.update',
            'patients.view',
            'patients.create',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo([
            'visits.view', 'visits.create', 'visits.update', 'visits.finalize', 'visits.export',
            'clinical_records.view', 'patients.view', 'patients.create',
            'pharmaceuticals.view', 'pharmaceuticals.create', 'pharmaceuticals.update',
            'lab_investigations.view', 'lab_investigations.create', 'lab_investigations.update',
        ]);
    }

    public function test_super_admin_can_update_practice_type_setting(): void
    {
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('Super Admin');

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'doctor_name' => 'Dr. Homeopath',
            'doctor_credentials' => 'BHMS',
            'phone' => '+8801700000000',
            'address' => 'Dhaka, Bangladesh',
            'practice_type' => 'homeopathy',
        ]);

        $response = $this->actingAs($admin)
            ->put(route('admin.settings.update'), [
                'clinic_name_en' => 'RemediQ Polyclinic',
                'doctor_name' => 'Dr. Homeopath',
                'doctor_credentials' => 'BHMS',
                'phone' => '+8801700000000',
                'address' => 'Dhaka, Bangladesh',
                'practice_type' => 'integrative_dual',
            ]);

        $response->assertRedirect(route('admin.settings.edit'));
        $this->assertDatabaseHas('clinic_settings', [
            'clinic_name_en' => 'RemediQ Polyclinic',
            'practice_type' => 'integrative_dual',
        ]);
    }

    public function test_practice_type_validation_rejects_invalid_modes(): void
    {
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('Super Admin');

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'doctor_name' => 'Dr. Homeopath',
            'doctor_credentials' => 'BHMS',
            'phone' => '+8801700000000',
            'address' => 'Dhaka, Bangladesh',
            'practice_type' => 'homeopathy',
        ]);

        $response = $this->actingAs($admin)
            ->put(route('admin.settings.update'), [
                'clinic_name_en' => 'RemediQ Polyclinic',
                'doctor_name' => 'Dr. Homeopath',
                'doctor_credentials' => 'BHMS',
                'phone' => '+8801700000000',
                'address' => 'Dhaka, Bangladesh',
                'practice_type' => 'invalid_unsupported_mode',
            ]);

        $response->assertSessionHasErrors('practice_type');
    }

    public function test_pharmaceutical_drug_crud_and_search_endpoint(): void
    {
        $doctorUser = User::factory()->create(['is_active' => true]);
        $doctorUser->assignRole('Doctor');

        // 1. Create Pharmaceutical
        $storeResponse = $this->actingAs($doctorUser)
            ->post(route('admin.pharmaceuticals.store'), [
                'brand_name' => 'Napa Extra',
                'generic_name' => 'Paracetamol + Caffeine',
                'dosage_form' => 'Tablet',
                'strength' => '500mg + 65mg',
                'manufacturer' => 'Beximco Pharmaceuticals Ltd',
                'description' => 'For acute headache and fever',
                'is_active' => true,
            ]);

        $storeResponse->assertRedirect(route('admin.pharmaceuticals.index'));
        $this->assertDatabaseHas('pharmaceuticals', [
            'brand_name' => 'Napa Extra',
            'generic_name' => 'Paracetamol + Caffeine',
        ]);

        $drug = Pharmaceutical::where('brand_name', 'Napa Extra')->firstOrFail();

        // 2. Update Pharmaceutical
        $updateResponse = $this->actingAs($doctorUser)
            ->put(route('admin.pharmaceuticals.update', $drug), [
                'brand_name' => 'Napa Extra Forte',
                'generic_name' => 'Paracetamol + Caffeine',
                'dosage_form' => 'Tablet',
                'strength' => '500mg + 65mg',
                'manufacturer' => 'Beximco Pharmaceuticals Ltd',
                'description' => 'Fast action pain relief',
                'is_active' => true,
            ]);

        $updateResponse->assertRedirect(route('admin.pharmaceuticals.index'));
        $this->assertDatabaseHas('pharmaceuticals', [
            'id' => $drug->id,
            'brand_name' => 'Napa Extra Forte',
        ]);

        // 3. Search Autocomplete
        $searchResponse = $this->actingAs($doctorUser)
            ->getJson(route('admin.pharmaceuticals.search', ['query' => 'napa']));

        $searchResponse->assertOk()
            ->assertJsonFragment(['brand_name' => 'Napa Extra Forte']);
    }

    public function test_lab_investigation_crud_and_search_endpoint(): void
    {
        $doctorUser = User::factory()->create(['is_active' => true]);
        $doctorUser->assignRole('Doctor');

        // 1. Create Lab Investigation
        $storeResponse = $this->actingAs($doctorUser)
            ->post(route('admin.lab_investigations.store'), [
                'name' => 'Complete Blood Count (CBC)',
                'category' => 'hematology',
                'default_instructions' => 'No fasting required',
                'is_active' => true,
            ]);

        $storeResponse->assertRedirect(route('admin.lab_investigations.index'));
        $this->assertDatabaseHas('lab_investigations', [
            'name' => 'Complete Blood Count (CBC)',
            'category' => 'hematology',
        ]);

        $test = LabInvestigation::where('name', 'Complete Blood Count (CBC)')->firstOrFail();

        // 2. Search Autocomplete
        $searchResponse = $this->actingAs($doctorUser)
            ->getJson(route('admin.lab_investigations.search', ['query' => 'CBC']));

        $searchResponse->assertOk()
            ->assertJsonFragment(['name' => 'Complete Blood Count (CBC)']);
    }

    public function test_doctor_creates_and_finalizes_visit_with_diagnoses_lab_orders_and_pharmaceuticals(): void
    {
        $doctorUser = User::factory()->create(['is_active' => true]);
        $doctorUser->assignRole('Doctor');

        $doctorProfile = Doctor::create([
            'user_id' => $doctorUser->id,
            'name' => 'Dr. Rahman MBBS',
            'degrees' => 'MBBS, FCPS',
            'specialty' => 'Internal Medicine',
            'is_active' => true,
        ]);

        $patient = Patient::factory()->create();

        $paracetamol = Pharmaceutical::create([
            'brand_name' => 'Napa',
            'generic_name' => 'Paracetamol',
            'dosage_form' => 'Tablet',
            'strength' => '500mg',
            'manufacturer' => 'Beximco',
            'is_active' => true,
        ]);

        $labTest = LabInvestigation::create([
            'name' => 'Serum Creatinine',
            'category' => 'biochemistry',
            'default_instructions' => 'Fasting not required',
            'is_active' => true,
        ]);

        // 1. Create Draft Visit with Diagnoses, Lab Order & Pharmaceutical
        $visitPayload = [
            'patient_id' => $patient->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Persistent fever and body ache for 3 days',
            'bp_symptoms_notes' => 'BP: 120/80 mmHg, Pulse: 84 bpm, Temp: 101F',
            'provisional_diagnosis' => 'Viral Pyrexia',
            'final_diagnosis' => 'Acute Viral Fever',
            'diagnosis_notes' => 'Mild dehydration noted',
            'status' => 'draft',
            'lab_investigations' => [
                [
                    'lab_investigation_id' => $labTest->id,
                    'test_name' => $labTest->name,
                    'instructions' => 'Report urgently',
                ],
            ],
            'prescription_items' => [
                [
                    'item_type' => 'pharmaceutical',
                    'pharmaceutical_id' => $paracetamol->id,
                    'brand_name' => $paracetamol->brand_name,
                    'generic_name' => $paracetamol->generic_name,
                    'strength' => $paracetamol->strength,
                    'dosage_form' => $paracetamol->dosage_form,
                    'timing' => ['morning', 'night'],
                    'before_after' => 'after_meal',
                    'duration_days' => 5,
                    'dose_qty' => 1,
                    'dose_unit' => 'tablet',
                ],
            ],
        ];

        $response = $this->actingAs($doctorUser)
            ->post(route('admin.visits.store'), $visitPayload);

        $response->assertRedirect(route('admin.visits.index'));

        $visit = Visit::where('patient_id', $patient->id)->firstOrFail();

        $this->assertSame('draft', $visit->status);
        $this->assertSame('Viral Pyrexia', $visit->provisional_diagnosis);
        $this->assertSame('Acute Viral Fever', $visit->final_diagnosis);

        // Verify lab investigation relation
        $this->assertDatabaseHas('visit_lab_investigations', [
            'visit_id' => $visit->id,
            'test_name' => 'Serum Creatinine',
            'instructions' => 'Report urgently',
        ]);

        // Verify prescription item with null medicine_id
        $this->assertDatabaseHas('prescription_items', [
            'visit_id' => $visit->id,
            'item_type' => 'pharmaceutical',
            'pharmaceutical_id' => $paracetamol->id,
            'brand_name' => 'Napa',
            'generic_name' => 'Paracetamol',
            'medicine_id' => null,
        ]);

        // 2. Finalize the Visit
        $finalizeResponse = $this->actingAs($doctorUser)
            ->post(route('admin.visits.finalize_draft', $visit), $visitPayload);

        $finalizeResponse->assertRedirect(route('admin.visits.show', $visit));

        $visit->refresh();
        $this->assertSame('finalized', $visit->status);
        $this->assertNotNull($visit->finalized_at);
        $this->assertNotNull($visit->finalized_by);

        // Verify prescription_snapshot captured pharmaceutical item parameters
        $item = $visit->prescriptionItems()->firstOrFail();
        $this->assertNotNull($item->prescription_snapshot);
        $snapshot = $item->prescription_snapshot;

        $this->assertSame('pharmaceutical', $snapshot['item_type']);
        $this->assertSame('Napa', $snapshot['brand_name']);
        $this->assertSame('Paracetamol', $snapshot['generic_name']);
        $this->assertSame('500mg', $snapshot['strength']);
        $this->assertCount(1, $visit->labInvestigations);
        $this->assertSame('Serum Creatinine', $visit->labInvestigations[0]->test_name);

        // 3. Export Prescription PDF
        $pdfResponse = $this->actingAs($doctorUser)
            ->get(route('admin.visits.pdf', $visit));

        $pdfResponse->assertOk();
        $this->assertSame('application/pdf', $pdfResponse->headers->get('Content-Type'));
    }
}
