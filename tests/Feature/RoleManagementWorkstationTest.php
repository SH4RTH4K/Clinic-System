<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleManagementWorkstationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_super_admin_can_view_role_workstation_with_kpis_and_roles(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        $doctorRole = $this->createRole('Doctor');
        $receptionistRole = $this->createRole('Receptionist');
        $dormantRole = $this->createRole('Archive Manager');

        $staff1 = $this->createStaffUser();
        $staff1->assignRole($doctorRole);

        $staff2 = $this->createStaffUser();
        $staff2->assignRole($receptionistRole);

        $response = $this->actingAs($admin)->get(route('admin.roles.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Roles/Index')
            ->has('roles', 4) // Super Admin, Doctor, Receptionist, Archive Manager
            ->has('kpis', fn (Assert $kpi) => $kpi
                ->where('total_roles', 4)
                ->where('total_assignments', 3) // 1 admin + 2 staff
                ->where('custom_roles_count', 3)
                ->where('unassigned_roles_count', 1) // Archive Manager
                ->where('protected_roles_count', 1)
            )
            ->where('filters.search', '')
            ->where('filters.filter', 'all')
        );
    }

    public function test_admin_can_search_roles_by_name(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        $this->createRole('Senior Homeopath');
        $this->createRole('Junior Doctor');
        $this->createRole('Receptionist');

        $response = $this->actingAs($admin)->get(route('admin.roles.index', ['search' => 'Homeopath']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Roles/Index')
            ->has('roles', 1)
            ->where('roles.0.name', 'Senior Homeopath')
            ->where('filters.search', 'Homeopath')
        );
    }

    public function test_admin_can_filter_roles_by_protected_status(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        $this->createRole('Doctor');
        $this->createRole('Pharmacist');

        $response = $this->actingAs($admin)->get(route('admin.roles.index', ['filter' => 'protected']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Roles/Index')
            ->has('roles', 1)
            ->where('roles.0.name', 'Super Admin')
            ->where('filters.filter', 'protected')
        );
    }

    public function test_admin_can_filter_roles_by_custom_status(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        $this->createRole('Doctor');
        $this->createRole('Receptionist');

        $response = $this->actingAs($admin)->get(route('admin.roles.index', ['filter' => 'custom']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Roles/Index')
            ->has('roles', 2)
            ->where('filters.filter', 'custom')
        );
    }

    public function test_admin_can_filter_roles_by_assigned_and_unassigned_status(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        $assignedRole = $this->createRole('Dispensary Pharmacist');
        $unassignedRole = $this->createRole('Night Auditor');

        $staff = $this->createStaffUser();
        $staff->assignRole($assignedRole);

        // Test Assigned Filter
        $responseAssigned = $this->actingAs($admin)->get(route('admin.roles.index', ['filter' => 'assigned']));
        $responseAssigned->assertOk();
        $responseAssigned->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Roles/Index')
            ->has('roles', 2) // Super Admin (has admin user) + Dispensary Pharmacist
        );

        // Test Unassigned Filter
        $responseUnassigned = $this->actingAs($admin)->get(route('admin.roles.index', ['filter' => 'unassigned']));
        $responseUnassigned->assertOk();
        $responseUnassigned->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Roles/Index')
            ->has('roles', 1)
            ->where('roles.0.name', 'Night Auditor')
        );
    }

    public function test_cannot_delete_role_with_assigned_users(): void
    {
        $admin = $this->createSuperAdminUser();
        $doctorRole = $this->createRole('Doctor');

        $staff = $this->createStaffUser();
        $staff->assignRole($doctorRole);

        $response = $this->actingAs($admin)->delete(route('admin.roles.destroy', $doctorRole));

        $response->assertSessionHasErrors('role');
        $this->assertDatabaseHas('roles', ['id' => $doctorRole->id]);
    }

    public function test_can_delete_unassigned_custom_role(): void
    {
        $admin = $this->createSuperAdminUser();
        $temporaryRole = $this->createRole('Temporary Helper');

        $response = $this->actingAs($admin)->delete(route('admin.roles.destroy', $temporaryRole));

        $response->assertRedirect(route('admin.roles.index'));
        $response->assertSessionHas('success', 'Role deleted.');
        $this->assertDatabaseMissing('roles', ['id' => $temporaryRole->id]);
    }

    public function test_super_admin_role_cannot_be_deleted_or_edited(): void
    {
        $admin = $this->createSuperAdminUser();
        $superAdminRole = Role::query()->where('name', 'Super Admin')->firstOrFail();

        $this->actingAs($admin)->get(route('admin.roles.edit', $superAdminRole))->assertForbidden();
        $this->actingAs($admin)->put(route('admin.roles.update', $superAdminRole), ['name' => 'Hacked Admin'])->assertForbidden();
        $this->actingAs($admin)->delete(route('admin.roles.destroy', $superAdminRole))->assertForbidden();
    }

    private function createSuperAdminUser(): User
    {
        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $role->givePermissionTo($this->permission('roles.view'));
        $role->givePermissionTo($this->permission('roles.create'));
        $role->givePermissionTo($this->permission('roles.update'));
        $role->givePermissionTo($this->permission('roles.delete'));

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
