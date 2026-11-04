<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthenticationAuthorizationHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'users.view', 'users.create', 'users.update', 'users.delete',
            'roles.view', 'roles.create', 'roles.update', 'roles.delete',
            'clinic_settings.view', 'clinic_settings.update',
            'general_settings.view', 'general_settings.create', 'general_settings.update', 'general_settings.delete',
            'activity_logs.view', 'patients.view', 'doctors.view',
        ] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web'])
            ->givePermissionTo(Permission::all());
        Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Accountant', 'guard_name' => 'web']);
    }

    public function test_an_authenticated_user_is_logged_out_when_deactivated(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole('Doctor');
        Role::findByName('Doctor')->givePermissionTo('patients.view');

        $this->post('/login', [
            'username' => $user->username,
            'password' => 'Password1!',
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
        $user->update(['is_active' => false]);

        $this->get('/admin/patients')
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('username');

        $this->assertGuest();

        $user->update(['is_active' => true]);
        $this->get('/admin/patients')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_inactive_user_cannot_reuse_a_session_or_open_a_direct_admin_url(): void
    {
        $user = $this->userWithRole('Doctor', ['is_active' => false, 'must_change_password' => false]);
        Role::findByName('Doctor')->givePermissionTo('patients.view');

        $this->actingAs($user)
            ->get('/admin/patients')
            ->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = User::factory()->create([
            'username' => 'inactive-staff',
            'password' => Hash::make('Password1!'),
            'is_active' => false,
        ]);

        $this->post('/login', [
            'username' => $user->username,
            'password' => 'Password1!',
        ])->assertSessionHasErrors('username');

        $this->assertGuest();
    }

    public function test_login_rotates_the_session_and_logout_invalidates_it(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $this->get('/login');
        $sessionIdBeforeLogin = $this->app['session']->getId();

        $this->post('/login', [
            'username' => $user->username,
            'password' => 'Password1!',
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertNotSame($sessionIdBeforeLogin, $this->app['session']->getId());

        $this->withSession(['sensitive_marker' => 'in-memory-test-marker'])
            ->post('/logout')
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull(session('sensitive_marker'));
    }

    public function test_staff_with_admin_permissions_still_cannot_access_super_admin_routes(): void
    {
        $restrictedPermissions = [
            'users.view', 'users.create', 'users.update', 'users.delete',
            'roles.view', 'roles.create', 'roles.update', 'roles.delete',
            'clinic_settings.view', 'clinic_settings.update',
            'activity_logs.view',
        ];
        Role::findByName('Doctor')->givePermissionTo($restrictedPermissions);
        $doctor = $this->userWithRole('Doctor');

        foreach ([
            'GET' => [
                '/admin/users', '/admin/roles', '/admin/permissions',
                '/admin/settings', '/admin/activity-logs',
            ],
        ] as $method => $paths) {
            foreach ($paths as $path) {
                $this->actingAs($doctor)->call($method, $path)->assertForbidden();
            }
        }

        $this->actingAs($doctor)
            ->put('/admin/settings', ['clinic_name_en' => 'Unauthorized change'])
            ->assertForbidden();
    }

    public function test_clinical_permissions_remain_granular(): void
    {
        Role::findByName('Doctor')->givePermissionTo('patients.view');
        $doctor = $this->userWithRole('Doctor', ['must_change_password' => false]);

        $this->assertTrue($doctor->is_active);
        $this->actingAs($doctor)->get('/admin/patients')->assertOk();
        $this->actingAs($doctor)->get('/admin/users')->assertForbidden();
    }

    public function test_general_settings_keep_their_separate_granular_permission(): void
    {
        Role::findByName('Doctor')->givePermissionTo('general_settings.view');
        $doctor = $this->userWithRole('Doctor');

        $this->actingAs($doctor)->get('/admin/general-settings')->assertOk();

        Role::findByName('Doctor')->givePermissionTo('clinic_settings.view');
        $this->actingAs($doctor)->get('/admin/settings')->assertForbidden();
    }

    public function test_public_registration_routes_remain_disabled(): void
    {
        $this->get('/register')->assertNotFound();
        $this->post('/register', [])->assertNotFound();
    }

    public function test_forced_password_change_blocks_other_application_routes(): void
    {
        $doctor = $this->userWithRole('Doctor', ['must_change_password' => true]);

        $this->actingAs($doctor)
            ->get('/admin/patients')
            ->assertRedirect(route('profile.edit'));

        $this->actingAs($doctor)
            ->put('/password', [
                'current_password' => 'password',
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ])
            ->assertSessionHasNoErrors();

        $this->assertFalse($doctor->fresh()->must_change_password);
    }

    public function test_last_active_super_admin_cannot_be_demoted_deactivated_or_deleted(): void
    {
        $activeAdmin = $this->userWithRole('Super Admin', ['is_active' => true]);
        $this->userWithRole('Super Admin', ['is_active' => false]);

        $this->actingAs($activeAdmin)
            ->put("/admin/users/{$activeAdmin->id}", $this->adminUpdatePayload($activeAdmin, ['Doctor'], true))
            ->assertSessionHasErrors('roles');

        $this->actingAs($activeAdmin)
            ->put("/admin/users/{$activeAdmin->id}", $this->adminUpdatePayload($activeAdmin, ['Super Admin'], false))
            ->assertSessionHasErrors('is_active');

        $this->actingAs($activeAdmin)
            ->delete("/admin/users/{$activeAdmin->id}")
            ->assertSessionHasErrors('error');

        $this->assertDatabaseHas('users', ['id' => $activeAdmin->id, 'is_active' => true]);
        $this->assertTrue($activeAdmin->fresh()->hasRole('Super Admin'));
    }

    public function test_super_admin_mutations_preserve_one_active_administrator_across_successive_requests(): void
    {
        $firstAdmin = $this->userWithRole('Super Admin', ['is_active' => true]);
        $secondAdmin = $this->userWithRole('Super Admin', ['is_active' => true]);

        $this->actingAs($firstAdmin)
            ->put("/admin/users/{$firstAdmin->id}", $this->adminUpdatePayload($firstAdmin, ['Doctor'], true))
            ->assertRedirect(route('admin.users.index'));

        $this->assertFalse($firstAdmin->fresh()->hasRole('Super Admin'));

        $this->actingAs($secondAdmin)
            ->put("/admin/users/{$secondAdmin->id}", $this->adminUpdatePayload($secondAdmin, ['Super Admin'], false))
            ->assertSessionHasErrors('is_active');

        $this->assertTrue($secondAdmin->fresh()->is_active);
        $this->assertTrue($secondAdmin->fresh()->hasRole('Super Admin'));
        $this->assertSame(1, User::role('Super Admin')->where('is_active', true)->count());
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function userWithRole(string $roleName, array $attributes = []): User
    {
        $user = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
            ...$attributes,
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    /**
     * @param  array<int, string>  $roles
     * @return array<string, mixed>
     */
    private function adminUpdatePayload(User $user, array $roles, bool $isActive): array
    {
        return [
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'roles' => $roles,
            'is_active' => $isActive,
        ];
    }
}
