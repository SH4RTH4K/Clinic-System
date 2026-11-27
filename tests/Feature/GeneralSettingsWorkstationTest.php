<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\PatientNumberingProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GeneralSettingsWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'general_settings.view',
            'general_settings.create',
            'general_settings.update',
            'general_settings.delete',
            'settings.view',
            'patients.view',
            'patients.create',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdmin->givePermissionTo(Permission::all());

        $this->createClinicSetting();
    }

    public function test_unauthenticated_user_is_redirected_to_login(): void
    {
        $response = $this->get(route('admin.general_settings.edit'));
        $response->assertRedirect(route('login'));
    }

    public function test_unauthorized_user_receives_403_forbidden(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);

        $response = $this->actingAs($user)->get(route('admin.general_settings.edit'));
        $response->assertForbidden();
    }

    public function test_super_admin_can_view_general_settings_workstation_with_kpis(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        // Ensure at least one profile exists
        PatientNumberingProfile::firstOrCreate(
            ['category_code' => 'GEN'],
            [
                'name' => 'General Patients',
                'category' => 'General',
                'prefix' => 'HC',
                'include_year' => true,
                'reset_annually' => true,
                'separator' => '-',
                'number_padding' => 4,
                'starting_number' => 1,
                'is_active' => true,
                'is_default' => true,
            ]
        );

        $response = $this->actingAs($superAdmin)->get(route('admin.general_settings.edit'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Settings/General')
            ->has('profiles')
            ->has('kpis', fn (Assert $kpi) => $kpi
                ->has('total_profiles')
                ->has('active_profiles')
                ->has('default_profile_name')
                ->has('default_profile_preview')
                ->has('old_id_mode')
                ->has('total_registered_patients')
            )
            ->has('oldOrOtherIdConfig', fn (Assert $oldId) => $oldId
                ->has('mode')
                ->has('prefix')
                ->has('number_padding')
                ->has('allow_staff_override')
                ->has('max_length')
                ->has('preview')
            )
        );
    }

    public function test_user_with_general_settings_create_permission_can_create_profile(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['general_settings.view', 'general_settings.create']);

        $response = $this->actingAs($user)->post(route('admin.general_settings.profiles.store'), [
            'name' => 'Senior Citizens',
            'category' => 'Senior',
            'category_code' => 'SNR',
            'prefix' => 'SNR',
            'include_year' => true,
            'reset_annually' => true,
            'separator' => '-',
            'number_padding' => 4,
            'starting_number' => 1,
            'is_active' => true,
            'is_default' => false,
        ]);

        $response->assertRedirect(route('admin.general_settings.edit'));
        $this->assertDatabaseHas('patient_numbering_profiles', [
            'name' => 'Senior Citizens',
            'category_code' => 'SNR',
        ]);
    }

    public function test_user_with_general_settings_update_permission_can_save_old_id_config(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['general_settings.view', 'general_settings.update']);

        $response = $this->actingAs($user)->put(route('admin.general_settings.old_id_config.update'), [
            'mode' => 'auto',
            'prefix' => 'OLD-',
            'number_padding' => 5,
            'allow_staff_override' => true,
            'max_length' => 40,
        ]);

        $response->assertRedirect(route('admin.general_settings.edit'));

        $config = ClinicSetting::currentOldOrOtherIdConfig();
        $this->assertEquals('auto', $config['mode']);
        $this->assertEquals('OLD-', $config['prefix']);
        $this->assertEquals(5, $config['number_padding']);
        $this->assertTrue((bool) $config['allow_staff_override']);
    }

    public function test_cannot_deactivate_or_delete_last_active_numbering_profile(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        // Delete all except one
        PatientNumberingProfile::query()->delete();
        $lastProfile = PatientNumberingProfile::create([
            'name' => 'Sole Active Profile',
            'category' => 'Sole',
            'category_code' => 'SOLE',
            'prefix' => 'SOL',
            'include_year' => false,
            'reset_annually' => false,
            'separator' => '-',
            'number_padding' => 4,
            'starting_number' => 1,
            'is_active' => true,
            'is_default' => true,
        ]);

        $response = $this->actingAs($superAdmin)
            ->delete(route('admin.general_settings.profiles.destroy', $lastProfile));

        $response->assertSessionHasErrors();
        $this->assertTrue($lastProfile->fresh()->is_active);
    }

    private function createClinicSetting(): void
    {
        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Clinic',
            'doctor_name' => 'Dr. Fazlul Karim',
            'doctor_credentials' => 'DHMS',
            'address' => 'Dhaka',
            'phone' => '01700000000',
        ]);
    }
}
