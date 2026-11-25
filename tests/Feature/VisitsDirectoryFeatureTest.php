<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VisitsDirectoryFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $modules = ['patients', 'visits', 'clinical_records', 'settings'];
        $actions = ['view', 'create', 'update', 'delete', 'export', 'finalize'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}", 'guard_name' => 'web']);
            }
        }

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);

        $superAdminRole->givePermissionTo(Permission::all());
        $doctorRole->givePermissionTo([
            'patients.view', 'patients.create',
            'visits.view', 'visits.create', 'visits.update', 'visits.finalize', 'visits.export',
            'clinical_records.view',
        ]);
        $receptionistRole->givePermissionTo(['patients.view', 'patients.create', 'visits.view']);

        $this->superAdmin = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->superAdmin->assignRole('Super Admin');

        $this->doctorUser = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->doctorUser->assignRole('Doctor');

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'name' => 'Dr. Test Physician',
            'credentials' => 'BHMS, MD',
            'phone' => '01711111111',
            'is_active' => true,
        ]);

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'phone' => '01700000000',
            'address' => 'Dhaka',
            'doctor_name' => 'Dr. Test Physician',
            'doctor_credentials' => 'BHMS, MD',
            'practice_type' => 'homeopathy',
        ]);
    }

    public function test_authorized_user_can_view_visits_index_with_kpis_and_doctor_list(): void
    {
        $patient = Patient::factory()->create(['name' => 'Rahim Ahmed']);
        Visit::create([
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Severe headache',
            'final_diagnosis' => 'Migraine',
            'status' => 'finalized',
            'created_by' => $this->doctorUser->id,
        ]);

        $response = $this->actingAs($this->doctorUser)->get(route('admin.visits.index'));

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Admin/Visits/Index')
            ->has('visits.data', 1)
            ->where('kpis.total_visits', 1)
            ->where('kpis.visits_today', 1)
            ->where('kpis.finalized_visits', 1)
            ->where('kpis.draft_visits', 0)
            ->has('doctors', 1)
            ->where('currentDoctorId', $this->doctor->id)
        );
    }

    public function test_user_can_search_visits_by_patient_name_phone_and_diagnosis(): void
    {
        $p1 = Patient::factory()->create(['name' => 'Kashem Khan', 'phone' => '01712345678']);
        $p2 = Patient::factory()->create(['name' => 'Fatima Begum', 'phone' => '01887654321']);

        Visit::create([
            'patient_id' => $p1->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Chest tightness',
            'final_diagnosis' => 'Asthma',
            'status' => 'finalized',
            'created_by' => $this->doctorUser->id,
        ]);

        Visit::create([
            'patient_id' => $p2->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Skin rash and itching',
            'final_diagnosis' => 'Eczema',
            'status' => 'finalized',
            'created_by' => $this->doctorUser->id,
        ]);

        // Search by patient name
        $resName = $this->actingAs($this->doctorUser)->get(route('admin.visits.index', ['search' => 'Kashem']));
        $resName->assertOk();
        $resName->assertInertia(fn (AssertableInertia $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.patient.name', 'Kashem Khan')
        );

        // Search by phone
        $resPhone = $this->actingAs($this->doctorUser)->get(route('admin.visits.index', ['search' => '01887654321']));
        $resPhone->assertOk();
        $resPhone->assertInertia(fn (AssertableInertia $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.patient.name', 'Fatima Begum')
        );

        // Search by diagnosis
        $resDiag = $this->actingAs($this->doctorUser)->get(route('admin.visits.index', ['search' => 'Asthma']));
        $resDiag->assertOk();
        $resDiag->assertInertia(fn (AssertableInertia $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.final_diagnosis', 'Asthma')
        );
    }

    public function test_user_can_filter_visits_by_doctor_status_and_date(): void
    {
        $otherDoctorUser = User::factory()->create(['password' => Hash::make('Password1!'), 'is_active' => true]);
        $otherDoctor = Doctor::create([
            'user_id' => $otherDoctorUser->id,
            'name' => 'Dr. Second Physician',
            'credentials' => 'MBBS',
            'phone' => '01722222222',
            'is_active' => true,
        ]);

        $patient = Patient::factory()->create();

        // Visit 1: Dr. Test, Finalized, Today
        Visit::create([
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Visit 1',
            'status' => 'finalized',
            'created_by' => $this->doctorUser->id,
        ]);

        // Visit 2: Dr. Second, Draft, Yesterday
        Visit::create([
            'patient_id' => $patient->id,
            'doctor_id' => $otherDoctor->id,
            'visit_date' => now()->subDay()->toDateString(),
            'chief_complaint' => 'Visit 2',
            'status' => 'draft',
            'created_by' => $otherDoctorUser->id,
        ]);

        // Filter by doctor
        $resDoc = $this->actingAs($this->doctorUser)->get(route('admin.visits.index', ['doctor_id' => $otherDoctor->id]));
        $resDoc->assertOk();
        $resDoc->assertInertia(fn (AssertableInertia $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.doctor.name', 'Dr. Second Physician')
        );

        // Filter by status: draft
        $resStatus = $this->actingAs($this->doctorUser)->get(route('admin.visits.index', ['status' => 'draft']));
        $resStatus->assertOk();
        $resStatus->assertInertia(fn (AssertableInertia $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.status', 'draft')
        );

        // Filter by date: today
        $resDate = $this->actingAs($this->doctorUser)->get(route('admin.visits.index', ['date_filter' => 'today']));
        $resDate->assertOk();
        $resDate->assertInertia(fn (AssertableInertia $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.status', 'finalized')
        );
    }

    public function test_user_can_export_filtered_visits_to_csv(): void
    {
        $patient = Patient::factory()->create(['name' => 'Export Patient', 'phone' => '01799999999']);
        Visit::create([
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Export complaint test',
            'final_diagnosis' => 'Export Diagnosis',
            'status' => 'finalized',
            'created_by' => $this->doctorUser->id,
        ]);

        $response = $this->actingAs($this->doctorUser)->get(route('admin.visits.export', ['search' => 'Export']));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=utf-8');

        $streamedContent = $response->streamedContent();
        $this->assertStringContainsString('Visit Date', $streamedContent);
        $this->assertStringContainsString('Export Patient', $streamedContent);
        $this->assertStringContainsString('Export Diagnosis', $streamedContent);
        $this->assertStringContainsString('01799999999', $streamedContent);
    }

    public function test_unauthorized_user_without_clinical_records_view_is_forbidden_from_visits_index_and_export(): void
    {
        $receptionist = User::factory()->create(['password' => Hash::make('Password1!'), 'is_active' => true]);
        $receptionist->assignRole('Receptionist'); // has visits.view but NOT clinical_records.view

        $this->actingAs($receptionist)
            ->get(route('admin.visits.index'))
            ->assertForbidden();

        $this->actingAs($receptionist)
            ->get(route('admin.visits.export'))
            ->assertForbidden();
    }
}
