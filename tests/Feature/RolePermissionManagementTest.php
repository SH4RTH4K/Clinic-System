<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolePermissionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_permission_page_lists_configurable_roles_and_the_system_catalog(): void
    {
        $this->withoutVite();
        $user = $this->superAdminUser();
        $doctor = $this->createRole('Doctor');
        $permission = $this->permission('patients.view');
        $doctor->givePermissionTo($permission);

        $this->actingAs($user)->get(route('admin.permissions.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Permissions/Index')
                ->has('roles', 1)
                ->where('roles.0.name', 'Doctor')
                ->where('roles.0.permissions.0.name', 'patients.view')
                ->where('permissions', function ($catalog) {
                    $missingCatalogEntries = [
                        'patients.amend',
                        'visits.amend',
                        'visits.finalize',
                        'visits.cancel',
                        'visits.cancel_other',
                        'clinical_records.view',
                        'medicines.amend',
                        'symptoms.amend',
                        'symptom_medicine_map.amend',
                        'symptom_medicine_map.review',
                        'appointments.amend',
                        'reports.amend',
                        'settings.amend',
                        'users.amend',
                        'roles.amend',
                        'activity_logs.view',
                        'activity_logs.create',
                        'activity_logs.update',
                        'activity_logs.delete',
                        'activity_logs.export',
                        'activity_logs.amend',
                        'doctors.view',
                        'doctors.create',
                        'doctors.update',
                        'doctors.delete',
                        'prescription_options.view',
                        'prescription_options.create',
                        'prescription_options.update',
                        'prescription_options.delete',
                        'clinic_settings.view',
                        'clinic_settings.update',
                        'general_settings.view',
                        'general_settings.update',
                        'general_settings.create',
                        'general_settings.delete',
                        'patient_config.view',
                        'patient_config.create',
                        'patient_config.update',
                        'patient_config.order',
                        'patient_config.delete',
                        'system_health.manage',
                    ];

                    return $catalog->count() === 91
                        && $catalog->contains('name', 'patients.view')
                        && collect($missingCatalogEntries)->every(fn (string $permissionName): bool => $catalog->contains('name', $permissionName));
                }));
    }

    public function test_role_creation_does_not_assign_permissions(): void
    {
        $user = $this->superAdminUser();

        $this->actingAs($user)->post(route('admin.roles.store'), ['name' => 'Clinic Assistant'])
            ->assertRedirect(route('admin.roles.index'));

        $role = Role::query()->where('name', 'Clinic Assistant')->firstOrFail();
        $this->assertSame(0, $role->permissions()->count());
    }

    public function test_role_permission_assignments_are_saved_on_the_separate_permissions_page(): void
    {
        $user = $this->superAdminUser();
        $role = $this->createRole('Receptionist');
        $viewPermission = $this->permission('patients.view');
        $updatePermission = $this->permission('patients.update');
        $oldPermission = $this->permission('reports.view');
        $role->givePermissionTo($oldPermission);

        $this->actingAs($user)->put(route('admin.permissions.update', $role), [
            'permissions' => [$viewPermission->name, $updatePermission->name],
        ])->assertRedirect(route('admin.permissions.index'))
            ->assertSessionHas('success', 'Permissions updated for Receptionist.');

        $this->assertDatabaseHas('role_has_permissions', [
            'role_id' => $role->id,
            'permission_id' => $viewPermission->id,
        ]);
        $this->assertDatabaseHas('role_has_permissions', [
            'role_id' => $role->id,
            'permission_id' => $updatePermission->id,
        ]);
        $this->assertDatabaseMissing('role_has_permissions', [
            'role_id' => $role->id,
            'permission_id' => $oldPermission->id,
        ]);
    }

    public function test_permission_cache_reflects_role_changes_immediately(): void
    {
        $admin = $this->superAdminUser();
        $role = $this->createRole('Doctor');
        $oldPermission = $this->permission('patients.view');
        $newPermission = $this->permission('visits.cancel');
        $role->givePermissionTo($oldPermission);
        $doctor = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $doctor->assignRole($role);

        $this->assertTrue($doctor->can($oldPermission->name));
        $this->assertFalse($doctor->can($newPermission->name));

        $this->actingAs($admin)->put(route('admin.permissions.update', $role), [
            'permissions' => [$newPermission->name],
        ])->assertRedirect(route('admin.permissions.index'));

        $doctor->refresh();
        $this->assertTrue($doctor->can($newPermission->name));
        $this->assertFalse($doctor->can($oldPermission->name));
    }

    public function test_permission_assignment_rejects_keys_outside_the_system_catalog(): void
    {
        $user = $this->superAdminUser();
        $role = $this->createRole('Receptionist');

        $this->actingAs($user)->put(route('admin.permissions.update', $role), [
            'permissions' => ['patients.unrecognized'],
        ])->assertSessionHasErrors('permissions.0');

        $this->assertSame(0, $role->fresh()->permissions()->count());
    }

    public function test_super_admin_permission_assignments_cannot_be_changed(): void
    {
        $user = $this->superAdminUser();
        $superAdminRole = Role::query()->where('name', 'Super Admin')->firstOrFail();
        $permission = $this->permission('patients.view');
        $permissionCount = $superAdminRole->permissions()->count();

        $this->actingAs($user)->put(route('admin.permissions.update', $superAdminRole), [
            'permissions' => [],
        ])->assertForbidden();

        $this->assertSame($permissionCount, $superAdminRole->fresh()->permissions()->count());
        $this->assertDatabaseHas('role_has_permissions', [
            'role_id' => $superAdminRole->id,
            'permission_id' => $permission->id,
        ]);
    }

    public function test_role_deletion_is_blocked_while_staff_are_assigned(): void
    {
        $admin = $this->superAdminUser();
        $role = $this->createRole('Receptionist');
        $staffMember = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $staffMember->assignRole($role);

        $this->actingAs($admin)->delete(route('admin.roles.destroy', $role))
            ->assertRedirect()
            ->assertSessionHasErrors([
                'role' => 'Cannot delete Receptionist; it is assigned to 1 user. Reassign those users first.',
            ]);

        $this->assertModelExists($role);
    }

    public function test_unassigned_role_can_be_deleted(): void
    {
        $admin = $this->superAdminUser();
        $role = $this->createRole('Temporary Role');

        $this->actingAs($admin)->delete(route('admin.roles.destroy', $role))
            ->assertRedirect(route('admin.roles.index'))
            ->assertSessionHas('success', 'Role deleted.');

        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    public function test_super_admin_role_cannot_be_edited_or_deleted(): void
    {
        $admin = $this->superAdminUser();
        $superAdminRole = Role::query()->where('name', 'Super Admin')->firstOrFail();
        $permissionCount = $superAdminRole->permissions()->count();

        $this->actingAs($admin)->get(route('admin.roles.edit', $superAdminRole))->assertForbidden();
        $this->actingAs($admin)->put(route('admin.roles.update', $superAdminRole), ['name' => 'Renamed Admin'])->assertForbidden();
        $this->actingAs($admin)->delete(route('admin.roles.destroy', $superAdminRole))->assertForbidden();

        $this->assertSame('Super Admin', $superAdminRole->fresh()->name);
        $this->assertSame($permissionCount, $superAdminRole->fresh()->permissions()->count());
    }

    public function test_non_super_admin_cannot_open_permission_management(): void
    {
        $permission = $this->permission('roles.view');
        $role = $this->createRole('Receptionist');
        $role->givePermissionTo($permission);
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($role);

        $this->actingAs($user)->get(route('admin.permissions.index'))->assertForbidden();
    }

    private function superAdminUser(): User
    {
        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $role->givePermissionTo($this->permission('roles.view'));
        $role->givePermissionTo($this->permission('roles.create'));
        $role->givePermissionTo($this->permission('roles.update'));
        $role->givePermissionTo($this->permission('roles.delete'));
        $role->givePermissionTo($this->permission('patients.view'));
        $role->givePermissionTo($this->permission('patients.update'));

        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($role);

        return $user;
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
