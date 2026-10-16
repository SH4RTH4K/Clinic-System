<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserRoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create permissions and roles mirroring the seeder.
        $modules = ['patients', 'visits', 'medicines', 'symptoms', 'symptom_medicine_map',
            'appointments', 'reports', 'settings', 'users', 'roles'];
        $actions = ['view', 'create', 'update', 'delete', 'export'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}"]);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctor = Role::firstOrCreate(['name' => 'Doctor']);
        $receptionist = Role::firstOrCreate(['name' => 'Receptionist']);

        $superAdmin->givePermissionTo(Permission::all());
        $doctor->givePermissionTo(['users.view', 'roles.view']);
        $receptionist->givePermissionTo(['users.view', 'roles.view']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Test 1 & 2: Doctor / Receptionist cannot access users index
    // -------------------------------------------------------------------------

    public function test_doctor_cannot_access_users_index(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/users')
            ->assertStatus(403);
    }

    public function test_receptionist_cannot_access_users_index(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->get('/admin/users')
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 3: Doctor cannot access roles index
    // -------------------------------------------------------------------------

    public function test_doctor_cannot_access_roles_index(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/roles')
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 4: Non-Super-Admin cannot create a user with Super Admin role
    // -------------------------------------------------------------------------

    public function test_non_super_admin_cannot_create_super_admin_user(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->post('/admin/users', [
                'name' => 'Evil User',
                'username' => 'eviluser',
                'email' => 'evil@example.com',
                'password' => 'Password1!',
                'password_confirmation' => 'Password1!',
                'roles' => ['Super Admin'],
                'is_active' => true,
            ])
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 5: Last Super Admin cannot be deleted via UserController
    // -------------------------------------------------------------------------

    public function test_last_super_admin_cannot_be_deleted_via_users(): void
    {
        $superAdmin = $this->userWithRole('Super Admin');

        $this->actingAs($superAdmin)
            ->delete("/admin/users/{$superAdmin->id}")
            ->assertRedirect()
            ->assertSessionHasErrors('error');
    }

    // -------------------------------------------------------------------------
    // Test 6: DELETE /profile is gone (404 or 405)
    // -------------------------------------------------------------------------

    public function test_delete_profile_route_does_not_exist(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->delete('/profile', ['password' => 'Password1!'])
            ->assertStatus(405); // Method Not Allowed — route is registered GET/PATCH only
    }

    // -------------------------------------------------------------------------
    // Test 7: Super Admin can access users index
    // -------------------------------------------------------------------------

    public function test_super_admin_can_access_users_index(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->get('/admin/users')
            ->assertStatus(200);
    }

    // -------------------------------------------------------------------------
    // Test 8: Super Admin can create a user with Super Admin role
    // -------------------------------------------------------------------------

    public function test_super_admin_can_create_super_admin_user(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->post('/admin/users', [
                'name' => 'Second Admin',
                'username' => 'admin2',
                'email' => 'admin2@clinic.com',
                'password' => 'SecureP@ss99!',
                'password_confirmation' => 'SecureP@ss99!',
                'roles' => ['Super Admin'],
                'is_active' => true,
            ])
            ->assertRedirect(route('admin.users.index'));
    }

    // -------------------------------------------------------------------------
    // Test 9: Role creation with unknown permission returns validation error
    // -------------------------------------------------------------------------

    public function test_role_creation_with_unknown_permission_returns_422(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->post('/admin/roles', [
                'name' => 'Rogue Role',
                'permissions' => ['nonexistent.permission'],
            ])
            ->assertSessionHasErrors(['permissions.0']);
    }

    // -------------------------------------------------------------------------
    // Test 10: Password change requires current_password
    // -------------------------------------------------------------------------

    public function test_password_change_requires_current_password(): void
    {
        $superAdmin = $this->userWithRole('Super Admin');
        $target = $this->userWithRole('Doctor');

        $this->actingAs($superAdmin)
            ->put("/admin/users/{$target->id}", [
                'name' => $target->name,
                'username' => $target->username,
                'email' => $target->email,
                'roles' => ['Doctor'],
                'is_active' => true,
                'password' => 'NewSecureP@ss1!',
                'password_confirmation' => 'NewSecureP@ss1!',
                // current_password intentionally omitted
            ])
            ->assertSessionHasErrors(['current_password']);
    }
}
