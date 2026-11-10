<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
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

    public function test_super_admin_can_open_and_create_user_without_direct_user_permissions(): void
    {
        Role::query()->where('name', 'Super Admin')->firstOrFail()->syncPermissions([]);
        $superAdmin = $this->userWithRole('Super Admin');

        $this->actingAs($superAdmin)
            ->get(route('admin.users.create'))
            ->assertOk();

        $this->actingAs($superAdmin)
            ->post(route('admin.users.store'), [
                'name' => 'Synthetic Staff Account',
                'username' => 'synthetic_staff_account',
                'email' => 'synthetic-staff@example.invalid',
                'password' => 'SecureSynthetic1!',
                'password_confirmation' => 'SecureSynthetic1!',
                'roles' => ['Doctor'],
                'is_active' => true,
            ])
            ->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', ['username' => 'synthetic_staff_account']);
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

    public static function shortPasswords(): array
    {
        return [
            'one character' => ['1'],
            'two characters' => ['12'],
        ];
    }

    #[DataProvider('shortPasswords')]
    public function test_super_admin_can_create_user_with_any_password_length(string $password): void
    {
        $superAdmin = $this->userWithRole('Super Admin');

        $this->actingAs($superAdmin)
            ->from(route('admin.users.create'))
            ->post(route('admin.users.store'), [
                'name' => 'Weak Password Test User',
                'username' => 'weak_password_test_user',
                'email' => 'weak-password-test@example.invalid',
                'password' => $password,
                'password_confirmation' => $password,
                'roles' => ['Doctor'],
                'is_active' => true,
            ])
            ->assertRedirect(route('admin.users.index'));

        $createdUser = User::query()->where('username', 'weak_password_test_user')->firstOrFail();
        $this->assertTrue(Hash::check($password, $createdUser->password));
    }

    #[DataProvider('shortPasswords')]
    public function test_super_admin_can_reset_user_password_to_any_length(string $password): void
    {
        $superAdmin = $this->userWithRole('Super Admin');
        $target = $this->userWithRole('Doctor');
        $originalPasswordHash = $target->password;

        $this->actingAs($superAdmin)
            ->from(route('admin.users.edit', $target))
            ->put(route('admin.users.update', $target), [
                'name' => $target->name,
                'username' => $target->username,
                'email' => $target->email,
                'roles' => ['Doctor'],
                'is_active' => true,
                'password' => $password,
                'password_confirmation' => $password,
            ])
            ->assertRedirect(route('admin.users.index'));

        $this->assertNotSame($originalPasswordHash, $target->fresh()->password);
        $this->assertTrue(Hash::check($password, $target->fresh()->password));
    }

    // -------------------------------------------------------------------------
    // Role permissions are managed from the separate Permissions page.
    // -------------------------------------------------------------------------

    public function test_role_creation_rejects_permission_assignments(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->post('/admin/roles', [
                'name' => 'Rogue Role',
                'permissions' => ['nonexistent.permission'],
            ])
            ->assertSessionHasErrors(['permissions']);
    }

    // -------------------------------------------------------------------------
    // Test 10: Super Admin can reset another user's password
    // -------------------------------------------------------------------------

    public function test_super_admin_can_reset_another_users_password_without_current_password(): void
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
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'User updated.');

        $this->assertTrue(Hash::check('NewSecureP@ss1!', $target->fresh()->password));
        $this->assertTrue($target->fresh()->must_change_password);

        $this->actingAs($target->fresh())
            ->get('/admin/patients')
            ->assertRedirect(route('profile.edit'));
    }

    public function test_password_reset_rejects_mismatched_confirmation(): void
    {
        $superAdmin = $this->userWithRole('Super Admin');
        $target = $this->userWithRole('Doctor');
        $originalPassword = $target->password;

        $this->actingAs($superAdmin)
            ->put("/admin/users/{$target->id}", [
                'name' => $target->name,
                'username' => $target->username,
                'email' => $target->email,
                'roles' => ['Doctor'],
                'is_active' => true,
                'password' => 'NewSecureP@ss1!',
                'password_confirmation' => 'DifferentSecureP@ss1!',
            ])
            ->assertSessionHasErrors(['password'])
            ->assertSessionMissing('success');

        $this->assertSame($originalPassword, $target->fresh()->password);
    }
}
