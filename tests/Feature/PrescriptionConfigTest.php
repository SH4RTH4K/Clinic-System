<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PrescriptionConfigTest extends TestCase
{
    use RefreshDatabase;

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
        $receptionist = Role::firstOrCreate(['name' => 'Receptionist']);

        $superAdmin->givePermissionTo(Permission::all());
        $doctor->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update',
            'visits.view', 'visits.create', 'visits.update', 'visits.delete',
            'medicines.view', 'symptoms.view',
        ]);
        $receptionist->givePermissionTo([
            'patients.view', 'visits.view',
        ]);
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    public function test_super_admin_can_update_prescription_config_via_json(): void
    {
        $admin = $this->userWithRole('Super Admin');

        $newConfig = [
            'timing_options' => [
                ['key' => 'morning', 'label_en' => 'Morning', 'label_bn' => 'সকাল'],
                ['key' => 'noon', 'label_en' => 'Noon', 'label_bn' => 'দুপুর'],
                ['key' => 'bedtime', 'label_en' => 'Bedtime', 'label_bn' => 'ঘুমানোর পূর্বে'],
            ],
            'dose_units' => [
                ['key' => 'drops', 'label_en' => 'Drops', 'label_bn' => 'ফোটা'],
                ['key' => 'tablets', 'label_en' => 'Tablets', 'label_bn' => 'ট্যাবলেট'],
            ],
            'meal_relations' => [
                ['key' => 'before', 'label_en' => 'Before meal', 'label_bn' => 'আগে'],
                ['key' => 'after', 'label_en' => 'After meal', 'label_bn' => 'পরে'],
            ],
            'dilution_instructions' => [
                'with lukewarm water (কুসুম গরম পানি)',
            ],
            'duration_presets' => [5, 10, 20],
            'default_duration_days' => 10,
            'default_dose_qty' => 3.5,
            'default_dose_unit' => 'tablets',
        ];

        $response = $this->actingAs($admin)
            ->putJson(route('admin.settings.prescription_config'), $newConfig);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('prescription_config.default_dose_unit', 'tablets')
            ->assertJsonPath('prescription_config.default_duration_days', 10);

        $settings = ClinicSetting::first();
        $this->assertNotNull($settings);
        $this->assertEquals('tablets', $settings->prescription_config['default_dose_unit']);
    }

    public function test_receptionist_cannot_update_prescription_config(): void
    {
        $receptionist = $this->userWithRole('Receptionist');

        $response = $this->actingAs($receptionist)
            ->putJson(route('admin.settings.prescription_config'), [
                'timing_options' => [['key' => 'morning', 'label_en' => 'Morning']],
            ]);

        $response->assertForbidden();

        $response2 = $this->actingAs($receptionist)
            ->putJson(route('admin.prescription_options.update'), [
                'timing_options' => [['key' => 'morning', 'label_en' => 'Morning']],
            ]);

        $response2->assertForbidden();
    }

    public function test_super_admin_can_view_dedicated_prescription_options_page(): void
    {
        $admin = $this->userWithRole('Super Admin');

        $this->actingAs($admin)
            ->get(route('admin.prescription_options.edit'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/PrescriptionOptions/Edit')
                ->has('config')
                ->has('config.timing_options')
                ->has('config.dose_units')
            );
    }

    public function test_user_without_settings_view_cannot_view_dedicated_prescription_options_page(): void
    {
        $receptionist = $this->userWithRole('Receptionist');

        $this->actingAs($receptionist)
            ->get(route('admin.prescription_options.edit'))
            ->assertForbidden();
    }

    public function test_super_admin_can_update_via_dedicated_prescription_options_route(): void
    {
        $admin = $this->userWithRole('Super Admin');

        $this->actingAs($admin)
            ->put(route('admin.prescription_options.update'), [
                'timing_options' => [
                    ['key' => 'morning', 'label_en' => 'Morning', 'label_bn' => 'সকাল'],
                    ['key' => 'bedtime', 'label_en' => 'Bedtime', 'label_bn' => 'ঘুমানোর পূর্বে'],
                ],
                'dose_units' => [
                    ['key' => 'drops', 'label_en' => 'Drops', 'label_bn' => 'ফোটা'],
                ],
                'meal_relations' => [
                    ['key' => 'before', 'label_en' => 'Before', 'label_bn' => 'আগে'],
                ],
                'dilution_instructions' => ['with lukewarm water'],
                'duration_presets' => [7, 14, 30],
                'default_duration_days' => 14,
                'default_dose_qty' => 10,
                'default_dose_unit' => 'drops',
            ])
            ->assertSessionHas('success');

        $settings = ClinicSetting::first();
        $this->assertEquals(14, $settings->prescription_config['default_duration_days']);
    }

    public function test_prescription_config_is_passed_to_visit_create_and_edit_screens(): void
    {
        $doctor = $this->userWithRole('Doctor');
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'status' => 'draft',
        ]);

        $this->actingAs($doctor)
            ->get(route('admin.visits.create'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Visits/Create')
                ->has('prescriptionConfig')
                ->has('prescriptionConfig.timing_options')
                ->has('prescriptionConfig.dose_units')
            );

        $this->actingAs($doctor)
            ->get(route('admin.visits.edit', $visit->id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Visits/Edit')
                ->has('prescriptionConfig')
                ->has('prescriptionConfig.timing_options')
                ->has('prescriptionConfig.dose_units')
            );
    }

    public function test_visit_can_be_stored_with_custom_prescription_timing_and_units(): void
    {
        $admin = $this->userWithRole('Super Admin');
        $doctor = $this->userWithRole('Doctor');

        // Configure custom options in settings
        $this->actingAs($admin)
            ->putJson(route('admin.settings.prescription_config'), [
                'timing_options' => [
                    ['key' => 'morning', 'label_en' => 'Morning', 'label_bn' => 'সকাল'],
                    ['key' => 'bedtime', 'label_en' => 'Bedtime', 'label_bn' => 'ঘুমানোর পূর্বে'],
                ],
                'dose_units' => [
                    ['key' => 'tablets', 'label_en' => 'Tablets', 'label_bn' => 'ট্যাবলেট'],
                ],
            ]);

        $patient = Patient::factory()->create();
        $medicine = Medicine::create([
            'name' => 'Thuja Occidentalis',
            'potency' => '200C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        $this->actingAs($doctor)
            ->post(route('admin.visits.store'), [
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Skin warts',
                'status' => 'draft',
                'prescription_items' => [
                    [
                        'medicine_id' => $medicine->id,
                        'timing' => ['bedtime'],
                        'before_after' => 'before',
                        'dose_qty' => 2.5,
                        'dose_unit' => 'tablets',
                        'dilution_note' => 'dissolve under tongue',
                        'duration_days' => 15,
                    ],
                ],
            ])
            ->assertRedirect(route('admin.visits.index'));

        $this->assertDatabaseHas('prescription_items', [
            'medicine_id' => $medicine->id,
            'dose_unit' => 'tablets',
            'before_after' => 'before',
            'dilution_note' => 'dissolve under tongue',
            'duration_days' => 15,
        ]);
    }
}
