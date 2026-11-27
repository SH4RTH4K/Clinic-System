<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SystemHealthBackupScheduleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SystemHealthWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');
    }

    public function test_super_admin_receives_consolidated_kpis_on_system_health_index(): void
    {
        $role = Role::findOrCreate('Super Admin', 'web');
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole($role);

        $response = $this->actingAs($superAdmin)
            ->get(route('admin.system_health.index'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/SystemHealth')
                ->has('health')
                ->has('backups')
                ->has('backupCapabilities')
                ->has('kpis', fn (Assert $kpi) => $kpi
                    ->has('overall_status')
                    ->has('database_healthy')
                    ->has('storage_healthy')
                    ->has('migrations_healthy')
                    ->has('total_backups_count')
                    ->has('total_backups_bytes')
                    ->has('database_size_bytes')
                    ->has('uploads_size_bytes')
                    ->has('uploads_files_count')
                    ->has('scheduler_enabled')
                    ->has('scheduler_time')
                    ->has('scheduler_timezone')
                )
                ->has('csrfToken')
            );
    }

    public function test_user_with_system_health_manage_permission_can_access_workstation(): void
    {
        Permission::findOrCreate('system_health.manage', 'web');
        $role = Role::findOrCreate('IT Admin', 'web');
        $role->givePermissionTo('system_health.manage');

        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        $response = $this->actingAs($user)
            ->get(route('admin.system_health.index'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/SystemHealth')
                ->where('backupCapabilities.cpanel', false)
            );
    }

    public function test_unauthorized_user_is_forbidden_from_system_health_workstation(): void
    {
        $role = Role::findOrCreate('Receptionist', 'web');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        $this->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertForbidden();
    }

    public function test_super_admin_can_update_backup_schedule(): void
    {
        $role = Role::findOrCreate('Super Admin', 'web');
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole($role);

        $response = $this->actingAs($superAdmin)
            ->post(route('admin.system_health.backup_schedule'), [
                'enabled' => '1',
                'backup_time' => '03:45',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $scheduleService = app(SystemHealthBackupScheduleService::class);
        $settings = $scheduleService->settings();

        $this->assertTrue($settings['enabled']);
        $this->assertSame('03:45', $settings['time']);
    }

    public function test_super_admin_can_clear_compiled_caches(): void
    {
        $role = Role::findOrCreate('Super Admin', 'web');
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole($role);

        $response = $this->actingAs($superAdmin)
            ->post(route('admin.system_health.clear_caches'));

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();
        $response->assertSessionHas('success');
    }

    public function test_unauthorized_staff_cannot_clear_caches_or_update_schedule(): void
    {
        $role = Role::findOrCreate('Nurse', 'web');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        $this->actingAs($user)
            ->post(route('admin.system_health.clear_caches'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('admin.system_health.backup_schedule'), [
                'enabled' => '1',
                'backup_time' => '03:00',
            ])
            ->assertForbidden();
    }
}
