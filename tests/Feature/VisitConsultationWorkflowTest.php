<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VisitConsultationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $modules = ['patients', 'visits', 'clinical_records', 'medicines', 'symptoms', 'settings', 'users', 'roles'];
        $actions = ['view', 'create', 'update', 'delete', 'finalize'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}", 'guard_name' => 'web']);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);

        $superAdmin->givePermissionTo(Permission::all());
        $doctorRole->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update',
            'visits.view', 'visits.create', 'visits.update', 'visits.finalize',
            'clinical_records.view',
        ]);
        $receptionistRole->givePermissionTo([
            'patients.view', 'patients.create',
        ]);

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Test Clinic',
            'phone' => '01700000000',
            'address' => 'Dhaka',
            'doctor_name' => 'Dr. Test Doctor',
            'doctor_credentials' => 'BHMS, MD',
            'practice_type' => 'integrative_dual',
        ]);
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    private function createDoctorWithUser(User $user): Doctor
    {
        return Doctor::create([
            'user_id' => $user->id,
            'name' => 'Dr. '.$user->name,
            'credentials' => 'BHMS, MD',
            'is_active' => true,
        ]);
    }

    public function test_patient_search_includes_old_or_other_id_and_guardian_for_disambiguation(): void
    {
        $user = $this->userWithRole('Doctor');

        $patient = Patient::create([
            'patient_no' => 101,
            'patient_series' => 'A',
            'patient_code' => 'P-101A',
            'old_or_other_id' => 'OLD-9999',
            'name' => 'Abdur Rahim',
            'guardian_name' => 'Karim Box',
            'guardian_relationship' => 'Father',
            'gender' => 'male',
            'age_years' => 45,
        ]);

        $response = $this->actingAs($user)->getJson(route('admin.patients.search', ['q' => 'Rahim']));

        $response->assertOk();
        $data = $response->json();

        $this->assertCount(1, $data);
        $this->assertSame($patient->id, $data[0]['id']);
        $this->assertSame('OLD-9999', $data[0]['old_or_other_id']);
        $this->assertSame('Karim Box', $data[0]['guardian_name']);
        $this->assertSame(45, $data[0]['age_years']);
    }

    public function test_visits_create_page_receives_today_waiting_queue_tokens_for_doctor(): void
    {
        $user = $this->userWithRole('Doctor');
        $doctor = $this->createDoctorWithUser($user);

        $patient = Patient::create([
            'patient_no' => 102,
            'patient_series' => 'A',
            'name' => 'Begum Rokeya',
            'phone' => '01811223344',
            'gender' => 'female',
            'age_years' => 32,
        ]);

        $token = PatientQueueToken::create([
            'token_date' => now()->toDateString(),
            'token_number' => 5,
            'token_code' => 'T-005',
            'patient_id' => $patient->id,
            'patient_name' => $patient->name,
            'doctor_id' => $doctor->id,
            'status' => 'waiting',
            'priority' => 'normal',
        ]);

        $this->actingAs($user)->get(route('admin.visits.create'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Visits/Create')
                ->has('todayWaitingQueueTokens', 1)
                ->where('todayWaitingQueueTokens.0.id', $token->id)
                ->where('todayWaitingQueueTokens.0.token_code', 'T-005')
                ->where('todayWaitingQueueTokens.0.patient.name', 'Begum Rokeya')
            );
    }

    public function test_doctor_can_quick_update_patient_medical_history_inline(): void
    {
        $user = $this->userWithRole('Doctor');

        $patient = Patient::create([
            'patient_no' => 103,
            'patient_series' => 'A',
            'name' => 'Kamal Hossain',
            'gender' => 'male',
            'age_years' => 50,
            'medical_history' => null,
            'known_allergies' => null,
            'blood_group' => null,
        ]);

        $response = $this->actingAs($user)->postJson(route('admin.patients.quick_medical_update', $patient->id), [
            'medical_history' => 'Hypertension since 2018. Appendectomy in 2012.',
            'known_allergies' => 'Penicillin, dust mites',
            'blood_group' => 'O+',
        ]);

        $response->assertOk()
            ->assertJsonPath('patient.medical_history', 'Hypertension since 2018. Appendectomy in 2012.')
            ->assertJsonPath('patient.known_allergies', 'Penicillin, dust mites')
            ->assertJsonPath('patient.blood_group', 'O+');

        $this->assertSame('Hypertension since 2018. Appendectomy in 2012.', $patient->fresh()->medical_history);
        $this->assertSame('Penicillin, dust mites', $patient->fresh()->known_allergies);
        $this->assertSame('O+', $patient->fresh()->blood_group);
    }

    public function test_non_authorized_user_cannot_quick_update_patient_medical_history(): void
    {
        $user = $this->userWithRole('Receptionist');

        $patient = Patient::create([
            'patient_no' => 104,
            'patient_series' => 'A',
            'name' => 'Test Patient',
            'gender' => 'male',
        ]);

        $this->actingAs($user)->postJson(route('admin.patients.quick_medical_update', $patient->id), [
            'medical_history' => 'Unauthorized update',
        ])->assertForbidden();
    }

    public function test_finalizing_visit_redirects_to_visit_show_when_requested(): void
    {
        $user = $this->userWithRole('Doctor');
        $doctor = $this->createDoctorWithUser($user);

        $patient = Patient::create([
            'patient_no' => 105,
            'patient_series' => 'A',
            'name' => 'Shirin Akter',
            'gender' => 'female',
            'age_years' => 29,
        ]);

        $medicine = Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '30CH',
            'form' => 'drops',
        ]);

        $token = PatientQueueToken::create([
            'token_date' => now()->toDateString(),
            'token_number' => 8,
            'token_code' => 'T-008',
            'patient_id' => $patient->id,
            'patient_name' => $patient->name,
            'doctor_id' => $doctor->id,
            'status' => 'calling',
        ]);

        $payload = [
            'patient_id' => $patient->id,
            'token_id' => $token->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Headache and fatigue for 3 days.',
            'final_diagnosis' => 'Tension Headache',
            'sync_diagnosis_to_medical_history' => true,
            'redirect_to' => 'show',
            'prescription_items' => [
                [
                    'item_type' => 'remedy',
                    'medicine_id' => $medicine->id,
                    'timing' => ['morning', 'night'],
                    'before_after' => 'after',
                    'dose_qty' => 5,
                    'dose_unit' => 'drops',
                    'duration_days' => 5,
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('admin.visits.finalize'), $payload);

        $createdVisit = Visit::latest('id')->first();
        $this->assertNotNull($createdVisit);

        $response->assertRedirect(route('admin.visits.show', $createdVisit->id));
        $this->assertSame('completed', $token->fresh()->status);
        $this->assertSame($createdVisit->id, $token->fresh()->visit_id);

        // Verify diagnosis was synced to permanent medical history
        $this->assertStringContainsString('Tension Headache', (string) $patient->fresh()->medical_history);
    }
}
