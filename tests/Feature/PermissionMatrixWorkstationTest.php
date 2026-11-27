<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermissionMatrixWorkstationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_super_admin_can_view_permission_matrix_with_kpis(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        $doctorRole = $this->createRole('Doctor');
        $receptionistRole = $this->createRole('Receptionist');

        $staff = $this->createStaffUser();
        $staff->assignRole($doctorRole);

        $perm1 = $this->permission('patients.view');
        $perm2 = $this->permission('visits.view');
        $doctorRole->givePermissionTo([$perm1, $perm2]);

        $response = $this->actingAs($admin)->get(route('admin.permissions.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Permissions/Index')
            ->has('roles', 2) // Doctor, Receptionist (excludes Super Admin)
            ->has('permissions')
            ->has('kpis', fn (Assert $kpi) => $kpi
                ->where('total_roles', 2)
                ->where('total_assignments', 1)
                ->has('total_permissions')
            )
        );
    }

    public function test_admin_can_preselect_target_role_via_query_parameter(): void
    {
        $this->withoutVite();
        $admin = $this->createSuperAdminUser();

        $doctorRole = $this->createRole('Doctor');
        $pharmacistRole = $this->createRole('Dispensary Pharmacist');

        $response = $this->actingAs($admin)->get(route('admin.permissions.index', ['role' => $pharmacistRole->id]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Permissions/Index')
            ->where('filters.role', (string) $pharmacistRole->id)
        );
    }

    public function test_admin_can_sync_more_than_100_permissions_without_validation_ceiling_error(): void
    {
        $admin = $this->createSuperAdminUser();
        $clinicManagerRole = $this->createRole('Clinic Operations Director');

        // Generate 105 distinct permissions to test max:500 ceiling fix
        $permissionNames = [];
        for ($i = 1; $i <= 105; $i++) {
            $name = "test_module_{$i}.view";
            $this->permission($name);
            $permissionNames[] = $name;
        }

        $response = $this->actingAs($admin)->put(route('admin.permissions.update', $clinicManagerRole), [
            'permissions' => $permissionNames,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('admin.permissions.index'));
        $response->assertSessionHas('success', "Permissions updated for {$clinicManagerRole->name}.");

        $this->assertSame(105, $clinicManagerRole->fresh()->permissions()->count());
    }

    public function test_cannot_modify_permissions_of_super_admin_role(): void
    {
        $admin = $this->createSuperAdminUser();
        $superAdminRole = Role::query()->where('name', 'Super Admin')->firstOrFail();

        $perm = $this->permission('patients.view');

        $response = $this->actingAs($admin)->put(route('admin.permissions.update', $superAdminRole), [
            'permissions' => [$perm->name],
        ]);

        $response->assertForbidden();
    }

    public function test_non_super_admin_is_forbidden_from_updating_permissions(): void
    {
        $role = $this->createRole('Receptionist');
        $user = $this->createStaffUser();
        $user->assignRole($role);

        $perm = $this->permission('patients.view');

        $response = $this->actingAs($user)->put(route('admin.permissions.update', $role), [
            'permissions' => [$perm->name],
        ]);

        $response->assertForbidden();
    }

    public function test_duplicate_permissions_are_rejected(): void
    {
        $admin = $this->createSuperAdminUser();
        $doctorRole = $this->createRole('Doctor');
        $perm = $this->permission('patients.view');

        $response = $this->actingAs($admin)->put(route('admin.permissions.update', $doctorRole), [
            'permissions' => [$perm->name, $perm->name],
        ]);

        $response->assertSessionHasErrors('permissions.0');
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
