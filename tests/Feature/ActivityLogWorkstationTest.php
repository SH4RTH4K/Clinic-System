<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ActivityLogWorkstationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_super_admin_can_view_activity_logs_workstation_with_kpis(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        Activity::create([
            'log_name' => 'clinical_access',
            'description' => 'patient.detail.viewed',
            'event' => 'viewed',
            'causer_type' => User::class,
            'causer_id' => $admin->id,
            'properties' => [
                'patient_id' => 12,
                'visit_id' => 34,
                'authorization_outcome' => 'allowed',
            ],
        ]);

        Activity::create([
            'log_name' => 'clinical_access',
            'description' => 'clinical.access.denied',
            'event' => 'clinical.access.denied',
            'causer_type' => User::class,
            'causer_id' => $admin->id,
            'properties' => [
                'authorization_outcome' => 'denied',
                'denial_reason' => 'unauthorized_module',
            ],
        ]);

        $response = $this->actingAs($admin)->get(route('admin.activity_logs.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ActivityLogs/Index')
            ->has('logs.data', 2)
            ->has('kpis', fn (Assert $kpi) => $kpi
                ->where('total_logs', 2)
                ->where('today_logs', 2)
                ->where('clinical_access_count', 2)
                ->where('denied_alerts_count', 1)
                ->where('active_actors_today', 1)
            )
            ->has('actors')
            ->has('availableEvents')
            ->where('filters.filter', 'all')
        );
    }

    public function test_admin_can_search_activity_logs(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        Activity::create([
            'log_name' => 'default',
            'description' => 'prescription.template.created',
            'event' => 'created',
            'causer_type' => User::class,
            'causer_id' => $admin->id,
        ]);

        Activity::create([
            'log_name' => 'default',
            'description' => 'user.login.successful',
            'event' => 'login',
            'causer_type' => User::class,
            'causer_id' => $admin->id,
        ]);

        $response = $this->actingAs($admin)->get(route('admin.activity_logs.index', ['search' => 'template']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ActivityLogs/Index')
            ->has('logs.data', 1)
            ->where('logs.data.0.description', 'prescription.template.created')
            ->where('filters.search', 'template')
        );
    }

    public function test_admin_can_filter_logs_by_fast_pills(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        Activity::create([
            'log_name' => 'clinical_access',
            'description' => 'clinical.access.denied',
            'event' => 'clinical.access.denied',
            'properties' => ['authorization_outcome' => 'denied'],
        ]);

        Activity::create([
            'log_name' => 'system_health',
            'description' => 'backup.created',
            'event' => 'backup.created',
        ]);

        // Filter denied alerts
        $responseDenied = $this->actingAs($admin)->get(route('admin.activity_logs.index', ['filter' => 'denied']));
        $responseDenied->assertOk();
        $responseDenied->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ActivityLogs/Index')
            ->has('logs.data', 1)
            ->where('logs.data.0.description', 'clinical.access.denied')
        );

        // Filter system health operations
        $responseHealth = $this->actingAs($admin)->get(route('admin.activity_logs.index', ['filter' => 'system_health']));
        $responseHealth->assertOk();
        $responseHealth->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ActivityLogs/Index')
            ->has('logs.data', 1)
            ->where('logs.data.0.description', 'backup.created')
        );
    }

    public function test_super_admin_can_export_activity_logs_as_csv(): void
    {
        $admin = $this->createSuperAdminUser();

        Activity::create([
            'log_name' => 'clinical_access',
            'description' => 'patient.chart.opened',
            'event' => 'viewed',
            'causer_type' => User::class,
            'causer_id' => $admin->id,
            'properties' => [
                'patient_id' => 99,
                'visit_id' => 101,
                'authorization_outcome' => 'allowed',
            ],
        ]);

        $response = $this->actingAs($admin)->get(route('admin.activity_logs.export'));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment; filename=activity_logs_audit_', $response->headers->get('Content-Disposition'));

        $content = $response->streamedContent();
        $this->assertStringContainsString('Log ID', $content);
        $this->assertStringContainsString('Timestamp', $content);
        $this->assertStringContainsString('patient.chart.opened', $content);
        $this->assertStringContainsString('#99', $content);
        $this->assertStringContainsString('allowed', $content);
    }

    public function test_non_super_admin_is_forbidden_from_viewing_or_exporting_activity_logs(): void
    {
        $doctorRole = $this->createRole('Doctor');
        $doctor = $this->createStaffUser();
        $doctor->assignRole($doctorRole);

        $this->actingAs($doctor)->get(route('admin.activity_logs.index'))->assertForbidden();
        $this->actingAs($doctor)->get(route('admin.activity_logs.export'))->assertForbidden();
    }

    public function test_privacy_filtering_hides_sensitive_properties_from_non_clinical_logs(): void
    {
        $admin = $this->createSuperAdminUser();

        Activity::create([
            'log_name' => 'default',
            'description' => 'patient.updated',
            'event' => 'updated',
            'causer_type' => User::class,
            'causer_id' => $admin->id,
            'properties' => ['sensitive_data' => 'secret_illness_notes'],
        ]);

        $response = $this->actingAs($admin)->get(route('admin.activity_logs.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ActivityLogs/Index')
            ->has('logs.data', 1)
            ->missing('logs.data.0.properties.sensitive_data')
        );
    }

    private function createSuperAdminUser(): User
    {
        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $role->givePermissionTo($this->permission('activity_logs.view'));
        $role->givePermissionTo($this->permission('activity_logs.export'));

        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($role);

        return $user;
    }

    private function createStaffUser(): User
    {
        return User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    private function createRole(string $name): Role
    {
        return Role::create(['name' => $name, 'guard_name' => 'web']);
    }

    private function permission(string $name): Permission
    {
        return Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
    }
}
