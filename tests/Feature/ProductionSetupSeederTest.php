<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ProductionSetupSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProductionSetupSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_a_restricted_initial_admin_without_sample_clinical_content(): void
    {
        config(['app.name' => 'Synthetic Clinic']);

        (new ProductionSetupSeeder('owner@example.test', 'Synthetic-Owner-Password-7!'))->run();

        $admin = User::query()->where('username', 'superadmin')->firstOrFail();
        $this->assertTrue(Hash::check('Synthetic-Owner-Password-7!', $admin->password));
        $this->assertTrue($admin->is_active);
        $this->assertTrue($admin->must_change_password);
        $this->assertTrue($admin->hasRole('Super Admin'));
        $this->assertTrue($admin->can('users.create'));
        $this->assertTrue($admin->can('system_health.manage'));
        $this->assertFalse($admin->can('clinical_records.view'));
        $this->assertFalse($admin->can('visits.finalize'));
        $this->assertFalse($admin->can('symptom_medicine_map.review'));
        $this->assertFalse(Role::findByName('Doctor')->hasPermissionTo('visits.finalize'));
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('clinic_settings', ['clinic_name_en' => 'Synthetic Clinic', 'doctor_name' => '', 'doctor_credentials' => '', 'govt_reg_no' => null]);
        $this->assertDatabaseHas('patient_numbering_profiles', ['name' => 'General', 'prefix' => 'A', 'is_default' => true]);
        foreach (['patients', 'visits', 'doctors', 'advice_items', 'food_restrictions'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_refuses_existing_users_without_creating_roles_or_changing_their_password(): void
    {
        $existing = User::factory()->create();
        $originalPassword = $existing->password;

        try {
            (new ProductionSetupSeeder('owner@example.test', 'Synthetic-Owner-Password-7!'))->run();
            $this->fail('Existing accounts must prevent first-install provisioning.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Production setup requires an installation without existing users or roles.', $exception->getMessage());
        }

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('roles', 0);
        $this->assertSame($originalPassword, $existing->refresh()->password);
        $this->assertDatabaseCount('clinic_settings', 0);
    }

    public function test_refuses_existing_roles_without_changing_their_permissions(): void
    {
        $role = Role::create(['name' => 'Super Admin', 'guard_name' => 'web']);
        $role->givePermissionTo('reports.view');

        try {
            (new ProductionSetupSeeder('owner@example.test', 'Synthetic-Owner-Password-7!'))->run();
            $this->fail('Existing roles must prevent first-install provisioning.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Production setup requires an installation without existing users or roles.', $exception->getMessage());
        }

        $this->assertSame(['reports.view'], $role->refresh()->permissions->pluck('name')->all());
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('roles', 1);
    }

    public function test_rejects_invalid_initial_credentials_before_writing_accounts(): void
    {
        try {
            (new ProductionSetupSeeder('invalid-email', 'short'))->run();
            $this->fail('Initial administrator credentials must be validated.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('email', $exception->errors());
            $this->assertArrayHasKey('password', $exception->errors());
        }

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('roles', 0);
        $this->assertDatabaseCount('clinic_settings', 0);
    }
}
