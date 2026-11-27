<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PrescriptionOptionsWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'prescription_options.view',
            'prescription_options.create',
            'prescription_options.update',
            'prescription_options.delete',
            'settings.view',
            'settings.update',
            'visits.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctor = Role::firstOrCreate(['name' => 'Doctor']);
        $receptionist = Role::firstOrCreate(['name' => 'Receptionist']);

        $superAdmin->givePermissionTo(Permission::all());
        $doctor->givePermissionTo([
            'prescription_options.view',
            'visits.view',
        ]);
        $receptionist->givePermissionTo([
            'visits.view',
        ]);
    }

    private function createUser(string $role): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($role);

        return $user;
    }

    public function test_super_admin_can_access_prescription_options_workstation_with_kpis(): void
    {
        $admin = $this->createUser('Super Admin');

        $response = $this->actingAs($admin)
            ->get(route('admin.prescription_options.edit'));

        $response->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/PrescriptionOptions/Edit')
                ->has('config')
                ->has('config.timing_options')
                ->has('config.dose_units')
                ->has('config.meal_relations')
                ->has('config.dilution_instructions')
                ->has('config.duration_presets')
                ->has('kpis')
                ->where('kpis.default_dose_unit', 'drops')
                ->where('kpis.default_duration_days', 7)
            );
    }

    public function test_doctor_with_view_permission_can_view_workstation(): void
    {
        $doctor = $this->createUser('Doctor');

        $this->actingAs($doctor)
            ->get(route('admin.prescription_options.edit'))
            ->assertOk();
    }

    public function test_unprivileged_user_cannot_access_prescription_options_workstation(): void
    {
        $receptionist = $this->createUser('Receptionist');

        $this->actingAs($receptionist)
            ->get(route('admin.prescription_options.edit'))
            ->assertForbidden();
    }

    public function test_super_admin_can_update_prescription_options_with_succussion_and_allopathy_units(): void
    {
        $admin = $this->createUser('Super Admin');

        $updatedConfig = [
            'timing_options' => [
                ['key' => 'morning', 'label_en' => 'Morning', 'label_bn' => 'সকাল'],
                ['key' => 'noon', 'label_en' => 'Noon', 'label_bn' => 'দুপুর'],
                ['key' => 'night', 'label_en' => 'Night', 'label_bn' => 'রাত'],
                ['key' => 'as_needed', 'label_en' => 'As needed (SOS)', 'label_bn' => 'প্রয়োজনমতো'],
            ],
            'dose_units' => [
                ['key' => 'drops', 'label_en' => 'Drops', 'label_bn' => 'ফোটা'],
                ['key' => 'pills', 'label_en' => 'Pills', 'label_bn' => 'বটিকা'],
                ['key' => 'tablets', 'label_en' => 'Tablets', 'label_bn' => 'ট্যাবলেট'],
                ['key' => 'capsules', 'label_en' => 'Capsules', 'label_bn' => 'ক্যাপসুল'],
                ['key' => 'sachets', 'label_en' => 'Sachets', 'label_bn' => 'স্যাচেট'],
            ],
            'meal_relations' => [
                ['key' => 'before', 'label_en' => 'Before meal', 'label_bn' => 'খাবার আগে'],
                ['key' => 'after', 'label_en' => 'After meal', 'label_bn' => 'খাবার পরে'],
                ['key' => '30_min_before', 'label_en' => '30 min before meal', 'label_bn' => 'খাবারের ৩০ মিনিট পূর্বে'],
            ],
            'dilution_instructions' => [
                '১০ ঝাঁকিসহ আধা কাপ পানির সাথে খাবেন',
                'খাবার আগে শিশি ১০ বার ঝাঁকিয়ে নিবেন',
                'with half a cup of water',
            ],
            'duration_presets' => [3, 7, 14, 21, 30],
            'default_duration_days' => 14,
            'default_dose_qty' => 10,
            'default_dose_unit' => 'drops',
        ];

        $response = $this->actingAs($admin)
            ->put(route('admin.prescription_options.update'), $updatedConfig);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $savedConfig = ClinicSetting::first()->getPrescriptionConfig();
        $this->assertSame(14, $savedConfig['default_duration_days']);
        $this->assertSame('drops', $savedConfig['default_dose_unit']);
        $this->assertCount(5, $savedConfig['dose_units']);
        $this->assertCount(3, $savedConfig['dilution_instructions']);
        $this->assertSame('১০ ঝাঁকিসহ আধা কাপ পানির সাথে খাবেন', $savedConfig['dilution_instructions'][0]);
    }

    public function test_api_json_update_returns_updated_configuration_payload(): void
    {
        $admin = $this->createUser('Super Admin');

        $updatedConfig = [
            'timing_options' => [
                ['key' => 'morning', 'label_en' => 'Morning', 'label_bn' => 'সকাল'],
                ['key' => 'night', 'label_en' => 'Night', 'label_bn' => 'রাত'],
            ],
            'dose_units' => [
                ['key' => 'drops', 'label_en' => 'Drops', 'label_bn' => 'ফোটা'],
                ['key' => 'capsules', 'label_en' => 'Capsules', 'label_bn' => 'ক্যাপসুল'],
            ],
            'meal_relations' => [
                ['key' => 'before', 'label_en' => 'Before', 'label_bn' => 'আগে'],
            ],
            'dilution_instructions' => [
                '১০ বার ঝাঁকিয়ে খাবেন',
            ],
            'duration_presets' => [7, 14],
            'default_duration_days' => 7,
            'default_dose_qty' => 5,
            'default_dose_unit' => 'drops',
        ];

        $response = $this->actingAs($admin)
            ->putJson(route('admin.prescription_options.update'), $updatedConfig);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Prescription configuration updated.')
            ->assertJsonPath('prescription_config.default_dose_unit', 'drops')
            ->assertJsonPath('prescription_config.dilution_instructions.0', '১০ বার ঝাঁকিয়ে খাবেন');
    }
}
