<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagementWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctorRole = Role::firstOrCreate(['name' => 'Doctor']);
        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist']);

        Permission::firstOrCreate(['name' => 'users.view']);
        Permission::firstOrCreate(['name' => 'users.create']);
        Permission::firstOrCreate(['name' => 'users.update']);
        Permission::firstOrCreate(['name' => 'users.delete']);

        $superAdminRole->givePermissionTo(Permission::all());
    }

    private function createSuperAdmin(string $name = 'Super Admin User', string $username = 'superadmin'): User
    {
        $user = User::factory()->create([
            'name' => $name,
            'username' => $username,
            'email' => "{$username}@clinic.test",
            'phone' => '01700000001',
            'password' => Hash::make('Password1!'),
            'is_active' => true,
        ]);
        $user->assignRole('Super Admin');

        return $user;
    }

    private function createDoctor(string $name = 'Dr. Rahman', string $username = 'drrahman'): User
    {
        $user = User::factory()->create([
            'name' => $name,
            'username' => $username,
            'email' => "{$username}@clinic.test",
            'phone' => '01711223344',
            'password' => Hash::make('Password1!'),
            'is_active' => true,
        ]);
        $user->assignRole('Doctor');

        return $user;
    }

    public function test_super_admin_can_view_users_workstation_with_kpis(): void
    {
        $admin = $this->createSuperAdmin();
        $this->createDoctor('Dr. Karim', 'drkarim');

        $response = $this->actingAs($admin)->get(route('admin.users.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Users/Index')
            ->has('users', 2)
            ->has('kpis')
            ->where('kpis.total_users', 2)
            ->where('kpis.active_users', 2)
            ->where('kpis.super_admins_count', 1)
            ->where('kpis.doctors_count', 1)
            ->where('kpis.support_staff_count', 0)
            ->has('filters')
            ->has('availableRoles')
        );
    }

    public function test_non_super_admin_roles_cannot_access_users_directory(): void
    {
        $doctor = $this->createDoctor();

        $this->actingAs($doctor)
            ->get(route('admin.users.index'))
            ->assertForbidden();
    }

    public function test_can_search_users_by_name_username_email_phone(): void
    {
        $admin = $this->createSuperAdmin();
        $doctor = $this->createDoctor('Dr. Nazmul Huda', 'drnazmul');

        // Search by name
        $response = $this->actingAs($admin)->get(route('admin.users.index', ['search' => 'Nazmul']));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Users/Index')
            ->has('users', 1)
            ->where('users.0.username', 'drnazmul')
        );

        // Search by phone
        $response = $this->actingAs($admin)->get(route('admin.users.index', ['search' => '01711223344']));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Users/Index')
            ->has('users', 1)
            ->where('users.0.id', $doctor->id)
        );
    }

    public function test_can_filter_users_by_role_and_status(): void
    {
        $admin = $this->createSuperAdmin();
        $activeDoc = $this->createDoctor('Dr. Active', 'dractive');

        $inactiveDoc = User::factory()->create([
            'name' => 'Dr. Inactive',
            'username' => 'drinactive',
            'email' => 'inactive@clinic.test',
            'is_active' => false,
        ]);
        $inactiveDoc->assignRole('Doctor');

        // Filter by role Doctor and status active
        $response = $this->actingAs($admin)->get(route('admin.users.index', [
            'role' => 'Doctor',
            'status' => 'active',
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Users/Index')
            ->has('users', 1)
            ->where('users.0.username', 'dractive')
        );

        // Filter by status inactive
        $response = $this->actingAs($admin)->get(route('admin.users.index', [
            'status' => 'inactive',
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Users/Index')
            ->has('users', 1)
            ->where('users.0.username', 'drinactive')
        );
    }

    public function test_super_admin_can_toggle_user_status(): void
    {
        $admin = $this->createSuperAdmin();
        $doctor = $this->createDoctor('Dr. Status Test', 'statustest');

        $this->assertTrue($doctor->is_active);

        // Toggle to inactive
        $response = $this->actingAs($admin)->patch(route('admin.users.toggle_status', $doctor));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        $doctor->refresh();
        $this->assertFalse($doctor->is_active);

        // Toggle back to active
        $response = $this->actingAs($admin)->patch(route('admin.users.toggle_status', $doctor));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        $doctor->refresh();
        $this->assertTrue($doctor->is_active);
    }

    public function test_cannot_deactivate_last_active_super_admin_via_quick_toggle(): void
    {
        $admin = $this->createSuperAdmin('Sole Admin', 'soleadmin');

        $response = $this->actingAs($admin)->patch(route('admin.users.toggle_status', $admin));

        $response->assertSessionHasErrors('is_active');
        $admin->refresh();
        $this->assertTrue($admin->is_active);
    }
}
