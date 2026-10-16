<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Security Edge-Case Tests (S16)
 *
 * Covers specific attack scenarios called out in the hardening instructions:
 * inactive users, login throttle, forced password change, last-Super-Admin
 * protections, appointment form throttle, and malformed visit payload guards.
 */
class SecurityEdgeCaseTest extends TestCase
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
        Role::firstOrCreate(['name' => 'Receptionist']);
        Role::firstOrCreate(['name' => 'Accountant']);

        $superAdmin->givePermissionTo(Permission::all());

        $doctor->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update', 'patients.delete',
            'visits.view', 'visits.create', 'visits.update', 'visits.delete',
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function userWithRole(string $roleName, array $overrides = []): User
    {
        $user = User::factory()->create(array_merge([
            'is_active' => true,
            'must_change_password' => false,
            'password' => Hash::make('Password1!'),
        ], $overrides));
        $user->assignRole($roleName);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Test 1: Inactive user cannot log in
    // -------------------------------------------------------------------------

    public function test_inactive_user_cannot_log_in(): void
    {
        User::factory()->create([
            'username' => 'inactiveuser',
            'email' => 'inactive@clinic.com',
            'password' => Hash::make('Password1!'),
            'is_active' => false,
        ]);

        $this->post('/login', [
            'username' => 'inactiveuser',
            'password' => 'Password1!',
        ])->assertSessionHasErrors();
    }

    // -------------------------------------------------------------------------
    // Test 2: Login throttle triggers on the 6th attempt
    // -------------------------------------------------------------------------

    public function test_login_throttled_after_five_failures(): void
    {
        // Clear any existing rate-limit state so this test is isolated.
        RateLimiter::clear('login');

        User::factory()->create([
            'username' => 'throttleduser',
            'email' => 'throttled@clinic.com',
            'password' => Hash::make('RealPassword1!'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'username' => 'throttleduser',
                'password' => 'WrongPassword!',
            ]);
        }

        $this->postJson('/login', [
            'username' => 'throttleduser',
            'password' => 'WrongPassword!',
        ])->assertJsonValidationErrors(['username'])
            ->assertJsonPath('errors.username.0', fn ($msg) => str_contains($msg, 'Too many login attempts'));
    }

    // -------------------------------------------------------------------------
    // Test 3: Forced password change redirects every route except profile/logout
    // -------------------------------------------------------------------------

    public function test_forced_password_change_redirects_to_profile(): void
    {
        $user = $this->userWithRole('Super Admin', ['must_change_password' => true]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect(route('profile.edit'));
    }

    public function test_forced_password_change_allows_profile_route(): void
    {
        $user = $this->userWithRole('Super Admin', ['must_change_password' => true]);

        $this->actingAs($user)
            ->get('/profile')
            ->assertStatus(200);
    }

    // -------------------------------------------------------------------------
    // Test 4: Last Super Admin cannot be deactivated via update
    // -------------------------------------------------------------------------

    public function test_last_super_admin_cannot_be_deactivated(): void
    {
        $superAdmin = $this->userWithRole('Super Admin');

        // The controller uses withErrors(['is_active' => '...']) for the deactivation guard.
        $this->actingAs($superAdmin)
            ->put("/admin/users/{$superAdmin->id}", [
                'name' => $superAdmin->name,
                'username' => $superAdmin->username,
                'email' => $superAdmin->email,
                'is_active' => false,
                'roles' => ['Super Admin'],
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('is_active');
    }

    // -------------------------------------------------------------------------
    // Test 5: Last Super Admin cannot be deleted via users
    // -------------------------------------------------------------------------

    public function test_last_super_admin_cannot_be_deleted(): void
    {
        $superAdmin = $this->userWithRole('Super Admin');

        $this->actingAs($superAdmin)
            ->delete("/admin/users/{$superAdmin->id}")
            ->assertRedirect()
            ->assertSessionHasErrors('error');
    }

    // -------------------------------------------------------------------------
    // Test 6: Appointment form — 6th POST in 1 minute triggers throttle (429)
    //
    // Phase 4 (throttle:5,1 on appointment route) not yet implemented.
    // This test is skipped until Phase 4 is done.
    // -------------------------------------------------------------------------

    public function test_appointment_form_throttled_after_five_submissions(): void
    {
        $payload = [
            'name' => 'John Doe',
            'phone' => '01711234567',
            'message' => 'Need appointment',
        ];

        for ($i = 0; $i < 5; $i++) {
            $this->post('/appointment-requests', $payload)
                ->assertSessionHasNoErrors();
        }

        $this->post('/appointment-requests', $payload)
            ->assertStatus(429);
    }

    // -------------------------------------------------------------------------
    // Test 7: Honeypot filled → 422
    // -------------------------------------------------------------------------

    public function test_appointment_honeypot_filled_returns_422(): void
    {
        $response = $this->postJson('/appointment-requests', [
            'name' => 'Bot Spammer',
            'phone' => '01711234567',
            'website' => 'http://spam-site.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['website']);
    }

    // -------------------------------------------------------------------------
    // Test 8: Malformed visit payload returns session validation errors (not 500)
    //
    // Inertia redirects back with session errors on validation failure (302),
    // so we assert session errors are set rather than a 422 status.
    // -------------------------------------------------------------------------

    public function test_malformed_visit_payload_never_returns_500(): void
    {
        $doctor = $this->userWithRole('Doctor');

        $response = $this->actingAs($doctor)
            ->post('/admin/visits', [
                'patient_id' => 999999,  // non-existent
                'visit_date' => 'not-a-date',
                'prescription_items' => 'should-be-array',
            ]);

        // Inertia returns a redirect with session errors, never a 500.
        $this->assertNotEquals(500, $response->getStatusCode());
        $response->assertSessionHasErrors();
    }

    // -------------------------------------------------------------------------
    // Test 9: Finalized visit cannot be deleted by Doctor (lacks visits.amend)
    // -------------------------------------------------------------------------

    public function test_finalized_visit_cannot_be_deleted_by_doctor(): void
    {
        $doctor = $this->userWithRole('Doctor');
        $visit = Visit::factory()->finalized()->create();

        $this->actingAs($doctor)
            ->delete("/admin/visits/{$visit->id}")
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 10: Guest is redirected to login on sampled admin GET routes
    // -------------------------------------------------------------------------

    #[DataProvider('adminGetRoutes')]
    public function test_guest_redirected_to_login_on_admin_routes(string $path): void
    {
        $this->get($path)->assertRedirect('/login');
    }

    /**
     * @return array<string, array<int, string>>
     */
    public static function adminGetRoutes(): array
    {
        return [
            'dashboard' => ['/dashboard'],
            'visits' => ['/admin/visits'],
            'patients' => ['/admin/patients'],
            'medicines' => ['/admin/medicines'],
            'reports' => ['/admin/reports'],
        ];
    }
}
