<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PatientConfigWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create permissions
        Permission::firstOrCreate(['name' => 'patient_config.view']);
        Permission::firstOrCreate(['name' => 'patient_config.create']);
        Permission::firstOrCreate(['name' => 'patient_config.update']);
        Permission::firstOrCreate(['name' => 'patient_config.order']);
        Permission::firstOrCreate(['name' => 'patient_config.delete']);

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctor = Role::firstOrCreate(['name' => 'Doctor']);

        $superAdmin->givePermissionTo(Permission::all());

        // Create initial clinic settings
        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Clinic',
            'phone' => '01700000000',
            'address' => 'Dhaka',
            'patient_no_series' => 'A',
            'patient_no_next' => 1,
            'doctor_name' => 'Dr. Smith',
            'doctor_credentials' => 'MBBS',
            'patient_form_config' => [
                'fields' => ClinicSetting::defaultPatientFormConfig(),
                'relationships' => ClinicSetting::defaultPatientRelationshipOptions(),
                'sections' => ClinicSetting::defaultPatientFormSections(),
            ],
        ]);
    }

    private function createSuperAdmin(): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
        ]);
        $user->assignRole('Super Admin');

        return $user;
    }

    private function createDoctor(): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
        ]);
        $user->assignRole('Doctor');

        return $user;
    }

    public function test_authorized_super_admin_can_view_patient_config_workstation_with_kpis(): void
    {
        $admin = $this->createSuperAdmin();

        $response = $this->actingAs($admin)->get(route('admin.patient_config.edit'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/PatientConfig/Edit')
            ->has('fields')
            ->has('relationships')
            ->has('sections')
            ->has('kpis')
            ->where('kpis.total_sections', 4)
            ->where('kpis.active_sections', 4)
            ->where('kpis.total_fields', 18)
            ->where('kpis.visible_fields', 16)
            ->where('kpis.required_fields', 2)
            ->where('kpis.is_migration_active', true)
        );
    }

    public function test_unauthorized_user_is_forbidden_from_viewing_patient_config(): void
    {
        $doctor = $this->createDoctor();

        $this->actingAs($doctor)
            ->get(route('admin.patient_config.edit'))
            ->assertForbidden();
    }

    public function test_authorized_user_can_update_fields_and_sections(): void
    {
        $admin = $this->createSuperAdmin();

        $fields = ClinicSetting::defaultPatientFormConfig();
        $fields['blood_group']['label'] = 'Blood Group (রক্তের গ্রুপ)';
        $fields['blood_group']['visible'] = true;
        $fields['blood_group']['required'] = true;

        $sections = ClinicSetting::defaultPatientFormSections();
        // Activate migration section
        foreach ($sections as &$sec) {
            if ($sec['key'] === 'legacy_migration') {
                $sec['visible'] = true;
                $sec['label'] = 'Patient Legacy Migration (পুরোনো কার্ড স্থানান্তর)';
            }
        }
        unset($sec);

        $payload = [
            'fields' => $fields,
            'relationships' => ClinicSetting::defaultPatientRelationshipOptions(),
            'sections' => $sections,
        ];

        $response = $this->actingAs($admin)->put(route('admin.patient_config.update'), $payload);

        $response->assertRedirect(route('admin.patient_config.edit'));
        $response->assertSessionHas('success', 'Patient form configuration updated.');

        $setting = ClinicSetting::first();
        $storedFields = $setting->getPatientFormConfig();
        $this->assertEquals('Blood Group (রক্তের গ্রুপ)', $storedFields['blood_group']['label']);
        $this->assertTrue($storedFields['blood_group']['required']);

        $storedSections = $setting->getPatientFormSections();
        $migrationSec = collect($storedSections)->firstWhere('key', 'legacy_migration');
        $this->assertTrue($migrationSec['visible']);
        $this->assertEquals('Patient Legacy Migration (পুরোনো কার্ড স্থানান্তর)', $migrationSec['label']);
    }

    public function test_authorized_user_can_add_custom_relationship(): void
    {
        $admin = $this->createSuperAdmin();

        $relationships = ClinicSetting::defaultPatientRelationshipOptions();
        $relationships[] = [
            'value' => 'custom_step_father',
            'label' => 'Step-Father',
        ];

        $payload = [
            'fields' => ClinicSetting::defaultPatientFormConfig(),
            'relationships' => $relationships,
            'sections' => ClinicSetting::defaultPatientFormSections(),
        ];

        $response = $this->actingAs($admin)->put(route('admin.patient_config.update'), $payload);

        $response->assertRedirect(route('admin.patient_config.edit'));

        $setting = ClinicSetting::first();
        $storedRel = $setting->getPatientRelationshipOptions();
        $this->assertNotNull(collect($storedRel)->firstWhere('value', 'custom_step_father'));
    }

    public function test_cannot_delete_relationship_actively_used_by_patients(): void
    {
        $admin = $this->createSuperAdmin();

        // Create patient linked to father relationship
        Patient::factory()->create([
            'guardian_relationship' => 'father',
            'guardian_name' => 'Abdur Rahim',
        ]);

        $response = $this->actingAs($admin)->delete(
            route('admin.patient_config.relationships.destroy', 'father')
        );

        $response->assertSessionHasErrors('relationshipDelete');

        $setting = ClinicSetting::first();
        $storedRel = $setting->getPatientRelationshipOptions();
        $this->assertNotNull(collect($storedRel)->firstWhere('value', 'father'));
    }

    public function test_can_delete_unused_relationship(): void
    {
        $admin = $this->createSuperAdmin();

        // First add an unused custom relationship
        $relationships = ClinicSetting::defaultPatientRelationshipOptions();
        $relationships[] = [
            'value' => 'custom_temporary_hostel',
            'label' => 'Hostel Authority',
        ];

        $setting = ClinicSetting::first();
        $stored = $setting->patient_form_config ?? [];
        $stored['relationships'] = $relationships;
        $setting->update(['patient_form_config' => $stored]);

        // Delete the unused relationship
        $response = $this->actingAs($admin)->delete(
            route('admin.patient_config.relationships.destroy', 'custom_temporary_hostel')
        );

        $response->assertSessionHas('success', 'Hostel Authority relationship deleted.');

        $setting->refresh();
        $storedRel = $setting->getPatientRelationshipOptions();
        $this->assertNull(collect($storedRel)->firstWhere('value', 'custom_temporary_hostel'));
    }
}
