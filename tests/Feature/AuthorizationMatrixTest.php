<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Role × Route Authorization Matrix (S16)
 *
 * Verifies that every HTTP verb / route combination enforces the
 * correct permission boundary for each role, and that guests are
 * always redirected to login.
 */
class AuthorizationMatrixTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Setup
    // -------------------------------------------------------------------------

    protected function setUp(): void
    {
        parent::setUp();

        $modules = [
            'patients', 'visits', 'medicines', 'symptoms', 'symptom_medicine_map',
            'appointments', 'reports', 'settings', 'users', 'roles', 'activity_logs',
        ];
        $actions = ['view', 'create', 'update', 'delete', 'export', 'amend'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}"]);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctor = Role::firstOrCreate(['name' => 'Doctor']);
        $receptionist = Role::firstOrCreate(['name' => 'Receptionist']);
        $accountant = Role::firstOrCreate(['name' => 'Accountant']);

        $superAdmin->givePermissionTo(Permission::all());

        $doctor->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update', 'patients.delete',
            'visits.view', 'visits.create', 'visits.update', 'visits.delete',
            'medicines.view', 'medicines.create', 'medicines.update', 'medicines.delete',
            'symptoms.view', 'symptoms.create', 'symptoms.update', 'symptoms.delete',
            'symptom_medicine_map.view', 'symptom_medicine_map.create',
            'symptom_medicine_map.update', 'symptom_medicine_map.delete',
            'appointments.view', 'appointments.update',
            'reports.view', 'reports.export',
        ]);

        $receptionist->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update',
            'visits.view',
            'medicines.view',
            'symptoms.view',
            'appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete',
        ]);

        $accountant->givePermissionTo(['reports.view']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
            'password' => Hash::make('Password1!'),
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Users resource — Super Admin only
    // -------------------------------------------------------------------------

    #[DataProvider('nonSuperAdminRoles')]
    public function test_users_index_forbidden_for_non_super_admin(string $role): void
    {
        $this->actingAs($this->userWithRole($role))
            ->get('/admin/users')
            ->assertStatus(403);
    }

    public function test_users_index_allowed_for_super_admin(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->get('/admin/users')
            ->assertStatus(200);
    }

    public function test_users_index_redirects_guest(): void
    {
        $this->get('/admin/users')->assertRedirect('/login');
    }

    #[DataProvider('nonSuperAdminRoles')]
    public function test_users_store_forbidden_for_non_super_admin(string $role): void
    {
        $this->actingAs($this->userWithRole($role))
            ->post('/admin/users', [])
            ->assertStatus(403);
    }

    #[DataProvider('nonSuperAdminRoles')]
    public function test_users_destroy_forbidden_for_non_super_admin(string $role): void
    {
        $target = $this->userWithRole('Doctor');

        $this->actingAs($this->userWithRole($role))
            ->delete("/admin/users/{$target->id}")
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Roles resource — Super Admin only
    // -------------------------------------------------------------------------

    #[DataProvider('nonSuperAdminRoles')]
    public function test_roles_index_forbidden_for_non_super_admin(string $role): void
    {
        $this->actingAs($this->userWithRole($role))
            ->get('/admin/roles')
            ->assertStatus(403);
    }

    public function test_roles_index_allowed_for_super_admin(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->get('/admin/roles')
            ->assertStatus(200);
    }

    public function test_roles_index_redirects_guest(): void
    {
        $this->get('/admin/roles')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Patients resource
    // -------------------------------------------------------------------------

    public function test_patients_index_allowed_for_doctor(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/patients')
            ->assertStatus(200);
    }

    public function test_patients_index_allowed_for_receptionist(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->get('/admin/patients')
            ->assertStatus(200);
    }

    public function test_patients_show_allowed_for_doctor(): void
    {
        $patient = Patient::factory()->create();
        Visit::factory()->create(['patient_id' => $patient->id]);

        $this->actingAs($this->userWithRole('Doctor'))
            ->get("/admin/patients/{$patient->id}")
            ->assertStatus(200);
    }

    public function test_patients_index_forbidden_for_accountant(): void
    {
        $this->actingAs($this->userWithRole('Accountant'))
            ->get('/admin/patients')
            ->assertStatus(403);
    }

    public function test_patients_index_redirects_guest(): void
    {
        $this->get('/admin/patients')->assertRedirect('/login');
    }

    public function test_patients_destroy_forbidden_for_receptionist(): void
    {
        $patient = Patient::factory()->create();

        $this->actingAs($this->userWithRole('Receptionist'))
            ->delete("/admin/patients/{$patient->id}")
            ->assertStatus(403);
    }

    public function test_patients_destroy_allowed_for_doctor(): void
    {
        $patient = Patient::factory()->create();

        $this->actingAs($this->userWithRole('Doctor'))
            ->delete("/admin/patients/{$patient->id}")
            ->assertRedirect();
    }

    public function test_patients_search_allowed_for_receptionist(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->getJson('/admin/patients/search?q=ab')
            ->assertStatus(200);
    }

    public function test_patients_search_forbidden_for_accountant(): void
    {
        $this->actingAs($this->userWithRole('Accountant'))
            ->getJson('/admin/patients/search?q=ab')
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Visits resource
    // -------------------------------------------------------------------------

    public function test_visits_index_allowed_for_doctor(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/visits')
            ->assertStatus(200);
    }

    public function test_visits_index_allowed_for_receptionist(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->get('/admin/visits')
            ->assertStatus(200);
    }

    public function test_visits_index_forbidden_for_accountant(): void
    {
        $this->actingAs($this->userWithRole('Accountant'))
            ->get('/admin/visits')
            ->assertStatus(403);
    }

    public function test_visits_store_forbidden_for_receptionist(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->post('/admin/visits', [])
            ->assertStatus(403);
    }

    public function test_visits_destroy_forbidden_for_receptionist(): void
    {
        $visit = Visit::factory()->create();

        $this->actingAs($this->userWithRole('Receptionist'))
            ->delete("/admin/visits/{$visit->id}")
            ->assertStatus(403);
    }

    public function test_visits_redirects_guest(): void
    {
        $this->get('/admin/visits')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Settings — Super Admin only
    // -------------------------------------------------------------------------

    public function test_settings_read_forbidden_for_doctor(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/settings')
            ->assertStatus(403);
    }

    public function test_settings_read_forbidden_for_receptionist(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->get('/admin/settings')
            ->assertStatus(403);
    }

    public function test_settings_read_allowed_for_super_admin(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->get('/admin/settings')
            ->assertStatus(200);
    }

    public function test_settings_update_forbidden_for_doctor(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->put('/admin/settings', [])
            ->assertStatus(403);
    }

    public function test_settings_redirects_guest(): void
    {
        $this->get('/admin/settings')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Reports
    // -------------------------------------------------------------------------

    public function test_reports_allowed_for_doctor(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/reports')
            ->assertStatus(200);
    }

    public function test_reports_allowed_for_accountant(): void
    {
        $this->actingAs($this->userWithRole('Accountant'))
            ->get('/admin/reports')
            ->assertStatus(200);
    }

    public function test_reports_forbidden_for_receptionist(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->get('/admin/reports')
            ->assertStatus(403);
    }

    public function test_reports_redirects_guest(): void
    {
        $this->get('/admin/reports')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Activity Logs — Super Admin only
    // -------------------------------------------------------------------------

    #[DataProvider('nonSuperAdminRoles')]
    public function test_activity_logs_forbidden_for_non_super_admin(string $role): void
    {
        $this->actingAs($this->userWithRole($role))
            ->get('/admin/activity-logs')
            ->assertStatus(403);
    }

    public function test_activity_logs_allowed_for_super_admin(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->get('/admin/activity-logs')
            ->assertStatus(200);
    }

    public function test_activity_logs_redirects_guest(): void
    {
        $this->get('/admin/activity-logs')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Appointments
    // -------------------------------------------------------------------------

    public function test_appointments_allowed_for_receptionist(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->get('/admin/appointment-requests')
            ->assertStatus(200);
    }

    public function test_appointments_forbidden_for_accountant(): void
    {
        $this->actingAs($this->userWithRole('Accountant'))
            ->get('/admin/appointment-requests')
            ->assertStatus(403);
    }

    public function test_appointments_redirects_guest(): void
    {
        $this->get('/admin/appointment-requests')->assertRedirect('/login');
    }

    // -------------------------------------------------------------------------
    // Data providers
    // -------------------------------------------------------------------------

    /**
     * @return array<string, array<int, string>>
     */
    public static function nonSuperAdminRoles(): array
    {
        return [
            'Doctor' => ['Doctor'],
            'Receptionist' => ['Receptionist'],
            'Accountant' => ['Accountant'],
        ];
    }
}
