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
