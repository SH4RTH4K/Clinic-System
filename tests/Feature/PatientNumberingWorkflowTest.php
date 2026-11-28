<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\PatientNumberingProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PatientNumberingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_can_be_registered_with_selected_category_and_yearly_sequence(): void
    {
        $this->travelTo(Carbon::parse('2031-04-05 10:00:00'));
        $this->createClinicSetting();
        $user = $this->userWithPermissions(['patients.create', 'general_settings.create']);

        $this->actingAs($user)
            ->post(route('admin.general_settings.profiles.store'), $this->profileData())
            ->assertRedirect(route('admin.general_settings.edit'));

        $profile = PatientNumberingProfile::query()->where('name', 'Child patients')->firstOrFail();

        $this->actingAs($user)
            ->post(route('admin.patients.store'), [
                'patient_numbering_profile_id' => $profile->id,
                'name' => 'Child Patient One',
                'gender' => 'female',
            ])
            ->assertRedirect(route('admin.patients.index'));

        $this->assertDatabaseHas('patients', [
            'name' => 'Child Patient One',
            'patient_no' => 22,
            'patient_series' => 'HC-2031-CH',
            'patient_code' => 'HC-2031-CH-0022',
            'patient_category' => 'Child',
            'patient_numbering_profile_id' => $profile->id,
        ]);

        $this->travelTo(Carbon::parse('2032-01-02 10:00:00'));

        $this->actingAs($user)
            ->post(route('admin.patients.store'), [
                'patient_numbering_profile_id' => $profile->id,
                'name' => 'Child Patient Two',
                'gender' => 'male',
            ])
            ->assertRedirect(route('admin.patients.index'));

        $this->assertDatabaseHas('patients', [
            'name' => 'Child Patient Two',
            'patient_no' => 22,
            'patient_series' => 'HC-2032-CH',
            'patient_code' => 'HC-2032-CH-0022',
            'patient_category' => 'Child',
        ]);

        $this->assertSame('HC-2031-CH-0022', Patient::query()->where('name', 'Child Patient One')->firstOrFail()->patient_identifier);
    }

    public function test_numbering_profiles_require_separate_create_update_and_delete_permissions(): void
    {
        $this->withoutVite();
        $user = $this->userWithPermissions(['general_settings.view']);
        $profile = PatientNumberingProfile::factory()->create();
        $attributes = $this->profileData();

        $this->actingAs($user)
            ->get(route('admin.general_settings.edit'))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Settings/General')
                ->has('profiles'));

        $this->actingAs($user)
            ->post(route('admin.general_settings.profiles.store'), $attributes)
            ->assertForbidden();

        $user->givePermissionTo(Permission::findByName('general_settings.create'));
        $this->actingAs($user)
            ->post(route('admin.general_settings.profiles.store'), $attributes)
            ->assertRedirect(route('admin.general_settings.edit'));

        $this->actingAs($user)
            ->put(route('admin.general_settings.profiles.update', $profile), $this->profileData([
                'name' => 'Updated profile',
                'is_default' => false,
            ]))
            ->assertForbidden();

        $user->givePermissionTo(Permission::findByName('general_settings.update'));
        $this->actingAs($user)
            ->put(route('admin.general_settings.profiles.update', $profile), $this->profileData([
                'name' => 'Updated profile',
                'prefix' => 'UPD',
                'category_code' => 'U1',
                'number_padding' => 11,
                'is_default' => false,
            ]))
            ->assertRedirect(route('admin.general_settings.edit'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('patient_numbering_profiles', [
            'id' => $profile->id,
            'number_padding' => 11,
        ]);

        $this->actingAs($user)
            ->delete(route('admin.general_settings.profiles.destroy', $profile))
            ->assertForbidden();

        $user->givePermissionTo(Permission::findByName('general_settings.delete'));
        $this->actingAs($user)
            ->delete(route('admin.general_settings.profiles.destroy', $profile))
            ->assertRedirect(route('admin.general_settings.edit'));

        $this->assertSoftDeleted('patient_numbering_profiles', ['id' => $profile->id]);
    }

    public function test_super_admin_can_view_and_update_old_or_other_id_configuration_from_general_settings(): void
    {
        $this->withoutVite();
        $this->createClinicSetting();
        $user = $this->userWithPermissions(['general_settings.view', 'general_settings.update']);

        $this->actingAs($user)
            ->get(route('admin.general_settings.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Settings/General')
                ->has('oldOrOtherIdConfig')
                ->where('oldOrOtherIdConfig.mode', 'auto')
                ->where('oldOrOtherIdConfig.prefix', 'OLD-')
                ->where('oldOrOtherIdConfig.number_padding', 4)
                ->where('oldOrOtherIdConfig.allow_staff_override', true)
                ->where('oldOrOtherIdConfig.max_length', 50));

        $this->actingAs($user)
            ->put(route('admin.general_settings.old_id_config.update'), [
                'mode' => 'manual',
                'prefix' => 'LEGACY-',
                'number_padding' => 5,
                'allow_staff_override' => false,
                'max_length' => 40,
            ])
            ->assertRedirect(route('admin.general_settings.edit'))
            ->assertSessionHas('success', 'Old/Other ID numbering configuration updated successfully.');

        $config = ClinicSetting::currentOldOrOtherIdConfig();
        $this->assertSame('manual', $config['mode']);
        $this->assertSame('LEGACY-', $config['prefix']);
        $this->assertSame(5, $config['number_padding']);
        $this->assertFalse($config['allow_staff_override']);
        $this->assertSame(40, $config['max_length']);
    }

    public function test_updating_old_or_other_id_numbering_to_custom_prefix_and_padding_generates_matching_sequence(): void
    {
        $this->createClinicSetting();
        $user = $this->userWithPermissions(['patients.create', 'general_settings.update']);
        $profile = PatientNumberingProfile::factory()->create([
            'is_default' => true,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->put(route('admin.general_settings.old_id_config.update'), [
                'mode' => 'auto',
                'prefix' => 'CARD-',
                'number_padding' => 5,
                'allow_staff_override' => true,
                'max_length' => 60,
            ])
            ->assertRedirect(route('admin.general_settings.edit'));

        $this->actingAs($user)
            ->post(route('admin.patients.store'), [
                'name' => 'Custom Prefix Patient',
                'gender' => 'male',
                'patient_numbering_profile_id' => $profile->id,
            ])
            ->assertRedirect(route('admin.patients.index'));

        $this->assertDatabaseHas('patients', [
            'name' => 'Custom Prefix Patient',
            'old_or_other_id' => 'CARD-00001',
        ]);
    }

    public function test_unauthorized_user_cannot_update_old_or_other_id_configuration(): void
    {
        $this->createClinicSetting();
        $user = $this->userWithPermissions(['general_settings.view']);

        $this->actingAs($user)
            ->put(route('admin.general_settings.old_id_config.update'), [
                'mode' => 'manual',
                'prefix' => 'OLD-',
                'number_padding' => 4,
                'allow_staff_override' => true,
                'max_length' => 50,
            ])
            ->assertForbidden();
    }

    public function test_patient_can_be_quickly_registered_via_json_request(): void
    {
        $this->createClinicSetting();
        $user = $this->userWithPermissions(['patients.create']);

        $response = $this->actingAs($user)
            ->postJson(route('admin.patients.store'), [
                'name' => 'Quick POS Patient',
                'gender' => 'male',
                'phone' => '01811223344',
                'age_years' => 32,
            ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Patient created successfully.',
            ])
            ->assertJsonPath('patient.name', 'Quick POS Patient')
            ->assertJsonPath('patient.phone', '01811223344');

        $this->assertDatabaseHas('patients', [
            'name' => 'Quick POS Patient',
            'gender' => 'male',
            'phone' => '01811223344',
            'age_years' => 32,
        ]);
    }

    /** @param array<string, mixed> $overrides */
    private function profileData(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Child patients',
            'category' => 'Child',
            'category_code' => 'ch',
            'prefix' => 'hc',
            'include_year' => true,
            'reset_annually' => true,
            'separator' => '-',
            'number_padding' => 4,
            'starting_number' => 22,
            'is_active' => true,
            'is_default' => false,
        ], $overrides);
    }

    /** @param list<string> $permissionNames */
    private function userWithPermissions(array $permissionNames): User
    {
        $permissions = collect($permissionNames)->map(fn (string $name) => Permission::findByName($name));
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo($permissions);

        return $user;
    }

    private function createClinicSetting(): void
    {
        ClinicSetting::create([
            'clinic_name_en' => 'Test Clinic',
            'doctor_name' => 'Dr. Test',
            'doctor_credentials' => 'DHMS',
            'address' => 'Dhaka',
            'phone' => '01700000000',
        ]);
    }
}
