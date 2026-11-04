<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PatientClinicalAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();

        foreach ([
            'patients.view', 'patients.create', 'patients.update',
            'visits.view', 'visits.create', 'visits.update', 'visits.export',
            'clinical_records.view', 'reports.view', 'appointments.view', 'appointments.update',
        ] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }
    }

    public function test_default_receptionist_can_register_and_schedule_with_demographics_only(): void
    {
        $this->seedApplicationDefaults();
        $patient = $this->patientWithClinicalHistory();
        $receptionist = $this->userWithRole('Receptionist');

        $this->assertTrue($receptionist->can('patients.view'));
        $this->assertTrue($receptionist->can('patients.create'));
        $this->assertTrue($receptionist->can('appointments.view'));
        $this->assertFalse($receptionist->can('visits.view'));
        $this->assertFalse($receptionist->can('clinical_records.view'));

        $patientListResponse = $this->actingAs($receptionist)
            ->get(route('admin.patients.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 1)
                ->where('patients.data.0.name', $patient->name)
                ->missing('patients.data.0.known_allergies')
                ->missing('patients.data.0.blood_group'));
        foreach (['Synthetic diagnosis text', 'Synthetic clinical complaint', 'Synthetic medicine detail', 'Synthetic prescription directions'] as $sensitiveValue) {
            $this->assertStringNotContainsString($sensitiveValue, (string) $patientListResponse->getContent());
        }

        $patientDetailResponse = $this->actingAs($receptionist)->get(route('admin.patients.show', $patient));
        $patientDetailResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('patient.name', 'Shared Synthetic Patient')
                ->missing('patient.known_allergies')
                ->missing('patient.blood_group')
                ->missing('patient.visits'));

        foreach (['Synthetic diagnosis text', 'Synthetic clinical complaint', 'Synthetic medicine detail', 'Synthetic prescription directions'] as $sensitiveValue) {
            $this->assertStringNotContainsString($sensitiveValue, (string) $patientDetailResponse->getContent());
        }

        $this->actingAs($receptionist)
            ->get(route('admin.patients.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('canViewClinicalRecords', false)
                ->where('fieldConfig.blood_group.visible', false)
                ->where('fieldConfig.known_allergies.visible', false));

        $profileId = DB::table('patient_numbering_profiles')->where('is_default', true)->value('id');
        $this->actingAs($receptionist)
            ->post(route('admin.patients.store'), [
                'patient_numbering_profile_id' => $profileId,
                'name' => 'Reception Registration',
                'gender' => 'female',
                'phone' => '01711111111',
                'known_allergies' => 'Receptionist must not set clinical fields',
            ])
            ->assertRedirect(route('admin.patients.index'));

        $registeredPatient = Patient::query()->where('name', 'Reception Registration')->firstOrFail();
        $this->assertNull($registeredPatient->known_allergies);

        $appointment = AppointmentRequest::query()->create([
            'name' => 'Synthetic appointment contact',
            'phone' => '01722222222',
            'preferred_date' => now()->toDateString(),
            'preferred_time' => '10:00:00',
            'status' => 'pending',
        ]);

        $this->actingAs($receptionist)->get(route('admin.appointment_requests.index'))->assertOk();
        $this->actingAs($receptionist)
            ->put(route('admin.appointment_requests.update', $appointment), ['status' => 'scheduled'])
            ->assertRedirect();

        $this->assertSame('scheduled', $appointment->fresh()->status);
        $this->assertSame($receptionist->id, $appointment->fresh()->handled_by);
    }

    public function test_legacy_receptionist_visits_view_grant_does_not_unlock_clinical_responses(): void
    {
        $this->seedApplicationDefaults();
        $patient = $this->patientWithClinicalHistory();
        $visit = $patient->visits()->firstOrFail();
        $receptionist = $this->userWithPermissions('Receptionist', [
            'patients.view', 'patients.update', 'visits.view', 'visits.export', 'reports.view',
        ]);

        $patientResponse = $this->actingAs($receptionist)->get(route('admin.patients.show', $patient));
        $patientResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->missing('patient.known_allergies')
                ->missing('patient.visits'));

        foreach ([
            route('admin.visits.index'),
            route('admin.visits.show', $visit),
            route('admin.visits.pdf', $visit),
            route('admin.visits.suggestions'),
            route('admin.reports.index'),
        ] as $url) {
            $response = $this->actingAs($receptionist)->get($url)->assertForbidden();

            foreach ([
                'Synthetic diagnosis text', 'Synthetic clinical complaint',
                'Synthetic medicine detail', 'Synthetic prescription directions',
            ] as $sensitiveValue) {
                $this->assertStringNotContainsString($sensitiveValue, (string) $response->getContent());
            }
        }

        $this->actingAs($receptionist)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('access.visits', false)
                ->missing('recent_visits')
                ->missing('top_medicines'));

        $this->actingAs($receptionist)
            ->get(route('admin.patients.edit', $patient))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->missing('patient.known_allergies')
                ->missing('patient.blood_group')
                ->where('fieldConfig.known_allergies.visible', false));
    }

    public function test_two_authorized_doctors_can_view_the_same_shared_patient_and_history(): void
    {
        $this->seedApplicationDefaults();
        $patient = $this->patientWithClinicalHistory();
        $doctorA = $this->doctorUser('Doctor A');
        $doctorB = $this->doctorUser('Doctor B');
        $visit = $patient->visits()->firstOrFail();

        foreach ([$doctorA, $doctorB] as $doctor) {
            $this->actingAs($doctor)
                ->get(route('admin.patients.show', $patient))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('patient.known_allergies', 'Synthetic patient allergy')
                    ->has('patient.visits', 1)
                    ->where('patient.visits.0.chief_complaint', 'Synthetic clinical complaint')
                    ->where('patient.visits.0.prescription_items.0.medicine.name', 'Synthetic medicine detail'));

            $this->actingAs($doctor)
                ->get(route('admin.visits.show', $visit))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('visit.diagnosis_notes', 'Synthetic diagnosis text')
                    ->where('prescriptionHistory.0.prescription_snapshot.medicine_name', 'Synthetic medicine detail'));
        }
    }

    public function test_patient_and_visit_routes_require_their_server_side_permissions(): void
    {
        $patient = $this->patientWithClinicalHistory();
        $visit = $patient->visits()->firstOrFail();
        $user = $this->userWithPermissions('Limited Staff', ['clinical_records.view', 'visits.view']);

        $this->actingAs($user)->get(route('admin.patients.show', $patient))->assertForbidden();

        $patientViewer = $this->userWithPermissions('Patient Viewer', ['patients.view', 'visits.view']);
        $this->actingAs($patientViewer)
            ->get(route('admin.patients.show', $patient))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->missing('patient.visits')->missing('patient.known_allergies'));
        $this->actingAs($patientViewer)->get(route('admin.visits.show', $visit))->assertForbidden();
    }

    public function test_seeded_super_admin_does_not_receive_clinical_chart_access(): void
    {
        $this->seedApplicationDefaults();
        $patient = $this->patientWithClinicalHistory();
        $defaultAdmin = $this->userWithRole('Super Admin');

        $this->assertFalse($defaultAdmin->can('clinical_records.view'));
        $this->actingAs($defaultAdmin)
            ->get(route('admin.patients.show', $patient))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->missing('patient.known_allergies')->missing('patient.visits'));
    }

    public function test_permission_migration_grants_doctors_only_and_is_retry_safe(): void
    {
        $doctorRole = Role::query()->create(['name' => 'Doctor', 'guard_name' => 'web']);
        $receptionistRole = Role::query()->create(['name' => 'Receptionist', 'guard_name' => 'web']);
        $legacyVisitPermission = Permission::firstOrCreate(['name' => 'visits.view', 'guard_name' => 'web']);
        $receptionistRole->givePermissionTo($legacyVisitPermission);

        $migration = require database_path('migrations/2026_11_04_032640_add_clinical_records_view_permission.php');
        $migration->up();
        $migration->up();

        $clinicalPermission = Permission::query()
            ->where('name', 'clinical_records.view')
            ->where('guard_name', 'web')
            ->firstOrFail();
        $this->assertTrue($doctorRole->fresh()->hasPermissionTo($clinicalPermission));
        $this->assertTrue($receptionistRole->fresh()->hasPermissionTo($legacyVisitPermission));
        $this->assertFalse($receptionistRole->fresh()->hasPermissionTo($clinicalPermission));
        $this->assertSame(1, DB::table('role_has_permissions')
            ->where('role_id', $doctorRole->id)
            ->where('permission_id', $clinicalPermission->id)
            ->count());
    }

    private function seedApplicationDefaults(): void
    {
        $previousPassword = getenv('SEED_ADMIN_PASSWORD');
        putenv('SEED_ADMIN_PASSWORD=synthetic-clinical-access-seed-password');

        try {
            $this->seed(DatabaseSeeder::class);
        } finally {
            if ($previousPassword === false) {
                putenv('SEED_ADMIN_PASSWORD');
            } else {
                putenv('SEED_ADMIN_PASSWORD='.$previousPassword);
            }
        }
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    /** @param array<int, string> $permissions */
    private function userWithPermissions(string $roleName, array $permissions): User
    {
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        foreach ($permissions as $permissionName) {
            $role->givePermissionTo(Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web',
            ]));
        }

        $user = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($role);

        return $user;
    }

    private function doctorUser(string $name): User
    {
        $user = $this->userWithRole('Doctor');
        Doctor::query()->create([
            'name' => $name,
            'user_id' => $user->id,
            'is_active' => true,
        ]);

        return $user;
    }

    private function patientWithClinicalHistory(): Patient
    {
        $patient = Patient::factory()->create([
            'name' => 'Shared Synthetic Patient',
            'known_allergies' => 'Synthetic patient allergy',
            'blood_group' => 'O+',
        ]);
        $visit = Visit::factory()->for($patient)->create([
            'chief_complaint' => 'Synthetic clinical complaint',
            'diagnosis_notes' => 'Synthetic diagnosis text',
            'status' => 'finalized',
        ]);
        $medicine = Medicine::query()->create([
            'name' => 'Synthetic medicine detail',
            'potency' => '30C',
            'form' => 'pills',
            'is_active' => true,
        ]);
        PrescriptionItem::query()->create([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'sort_order' => 0,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 5,
            'dose_unit' => 'pills',
            'dilution_note' => 'Synthetic prescription directions',
            'duration_days' => 7,
            'prescription_version' => 1,
            'prescription_snapshot' => [
                'medicine_name' => 'Synthetic medicine detail',
                'provenance' => ['kind' => 'prescriber_authorized_capture'],
                'authorizer' => ['authorized_by_user_id' => 1, 'authorized_at' => now()->toISOString()],
            ],
        ]);

        return $patient;
    }
}
