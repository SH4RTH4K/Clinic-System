<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PatientFormConfigurationTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_view_and_save_patient_field_configuration(): void
    {
        $user = $this->userWithRole('Super Admin', ['settings.view', 'settings.update']);
        $settings = $this->createClinicSetting();
        $fields = ClinicSetting::defaultPatientFormConfig();
        $fields['phone']['label'] = 'Primary phone';
        $fields['phone']['visible'] = false;
        $fields['phone']['required'] = true;
        $fields['phone']['order'] = 9;
        $fields['referred_by']['order'] = 8;
        $fields['address']['order'] = 7;
        $fields['name']['label'] = 'Patient name';
        $fields['name']['visible'] = false;
        $fields['name']['required'] = false;
        $relationships = ClinicSetting::defaultPatientRelationshipOptions();
        $relationships[] = ['value' => 'step_parent', 'label' => 'Step-parent'];

        $this->actingAs($user)->get(route('admin.patient_config.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/PatientConfig/Edit')
                ->has('fields.phone')
                ->where('fields.phone.label', 'Mobile Phone Number')
                ->where('relationships.0.label', 'Father'));

        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => $fields,
            'relationships' => $relationships,
        ])
            ->assertRedirect(route('admin.patient_config.edit'));

        $savedFields = $settings->fresh()->patient_form_config;
        $this->assertSame('Primary phone', $savedFields['fields']['phone']['label']);
        $this->assertFalse($savedFields['fields']['phone']['visible']);
        $this->assertTrue($savedFields['fields']['phone']['required']);
        $this->assertSame(9, $savedFields['fields']['phone']['order']);
        $this->assertSame(8, $savedFields['fields']['referred_by']['order']);
        $this->assertSame(7, $savedFields['fields']['address']['order']);
        $this->assertTrue($savedFields['fields']['name']['visible']);
        $this->assertTrue($savedFields['fields']['name']['required']);
        $this->assertSame('Step-parent', $savedFields['relationships'][18]['label']);
        $this->assertNotContains('other', array_column($savedFields['relationships'], 'value'));
    }

    public function test_non_super_admin_cannot_manage_patient_field_configuration(): void
    {
        $user = $this->userWithRole('Receptionist', ['settings.view', 'settings.update']);

        $this->actingAs($user)->get(route('admin.patient_config.edit'))->assertForbidden();
        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => ClinicSetting::defaultPatientFormConfig(),
            'relationships' => ClinicSetting::defaultPatientRelationshipOptions(),
        ])
            ->assertForbidden();
    }

    public function test_role_with_patient_config_permissions_can_manage_patient_field_configuration(): void
    {
        $user = $this->userWithRole('Receptionist', ['patient_config.view', 'patient_config.update']);

        $this->actingAs($user)->get(route('admin.patient_config.edit'))->assertOk();
        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => ClinicSetting::defaultPatientFormConfig(),
            'relationships' => ClinicSetting::defaultPatientRelationshipOptions(),
        ])->assertRedirect(route('admin.patient_config.edit'));
    }

    public function test_patient_config_create_permission_allows_adding_relationship_options_without_edit_permission(): void
    {
        $user = $this->userWithRole('Receptionist', ['patient_config.view', 'patient_config.create']);
        $fields = ClinicSetting::defaultPatientFormConfig();
        $relationships = ClinicSetting::defaultPatientRelationshipOptions();
        $relationships[] = ['value' => 'step_parent', 'label' => 'Step-parent'];

        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => $fields,
            'relationships' => $relationships,
        ])->assertRedirect(route('admin.patient_config.edit'));

        $this->assertContains('step_parent', array_column(
            ClinicSetting::first()->getPatientRelationshipOptions(),
            'value',
        ));

        $fields['phone']['label'] = 'Changed without edit permission';

        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => $fields,
            'relationships' => $relationships,
        ])->assertForbidden();
    }

    public function test_patient_config_update_permission_allows_editing_relationship_labels(): void
    {
        $user = $this->userWithRole('Receptionist', ['patient_config.view', 'patient_config.update']);
        $settings = $this->createClinicSetting();
        $relationships = ClinicSetting::defaultPatientRelationshipOptions();
        $relationships[0]['label'] = 'Parent';

        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => ClinicSetting::defaultPatientFormConfig(),
            'relationships' => $relationships,
        ])->assertRedirect(route('admin.patient_config.edit'));

        $this->assertSame('Parent', $settings->fresh()->getPatientRelationshipOptions()[0]['label']);
    }

    public function test_patient_config_order_permission_allows_reordering_without_edit_permission(): void
    {
        $user = $this->userWithRole('Receptionist', ['patient_config.view', 'patient_config.order']);
        $settings = $this->createClinicSetting();
        $fields = ClinicSetting::defaultPatientFormConfig();
        $fields['name']['order'] = 2;
        $fields['guardian_relationship']['order'] = 1;

        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => $fields,
            'relationships' => ClinicSetting::defaultPatientRelationshipOptions(),
        ])->assertRedirect(route('admin.patient_config.edit'));

        $this->assertSame(2, $settings->fresh()->getPatientFormConfig()['name']['order']);
        $this->assertSame(1, $settings->fresh()->getPatientFormConfig()['guardian_relationship']['order']);

        $fields = $settings->fresh()->getPatientFormConfig();
        $fields['phone']['label'] = 'Changed without edit permission';

        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => $fields,
            'relationships' => ClinicSetting::defaultPatientRelationshipOptions(),
        ])->assertForbidden();
    }

    public function test_patient_config_update_permission_does_not_allow_reordering_without_order_permission(): void
    {
        $user = $this->userWithRole('Receptionist', ['patient_config.view', 'patient_config.update']);
        $this->createClinicSetting();
        $fields = ClinicSetting::defaultPatientFormConfig();
        $fields['name']['order'] = 2;
        $fields['guardian_relationship']['order'] = 1;

        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => $fields,
            'relationships' => ClinicSetting::defaultPatientRelationshipOptions(),
        ])->assertForbidden();
    }

    public function test_patient_config_view_permission_does_not_allow_add_edit_or_delete_actions(): void
    {
        $user = $this->userWithRole('Receptionist', ['patient_config.view']);
        $this->createClinicSetting();

        $this->actingAs($user)->get(route('admin.patient_config.edit'))->assertOk();
        $this->actingAs($user)->put(route('admin.patient_config.update'), [
            'fields' => ClinicSetting::defaultPatientFormConfig(),
            'relationships' => ClinicSetting::defaultPatientRelationshipOptions(),
        ])->assertForbidden();
        $this->actingAs($user)
            ->delete(route('admin.patient_config.relationships.destroy', ['relationship' => 'father']))
            ->assertForbidden();
    }

    public function test_patient_create_uses_required_and_hidden_field_configuration(): void
    {
        $user = $this->userWithRole('Doctor', ['patients.create']);
        $settings = $this->createClinicSetting();
        $fields = ClinicSetting::defaultPatientFormConfig();
        $fields['phone']['required'] = true;
        $settings->update(['patient_form_config' => $fields]);

        $this->actingAs($user)->from(route('admin.patients.create'))
            ->post(route('admin.patients.store'), [
                'name' => 'Example Patient',
                'gender' => 'female',
            ])
            ->assertSessionHasErrors('phone');

        $fields['phone']['visible'] = false;
        $settings->update(['patient_form_config' => $fields]);

        $this->actingAs($user)->post(route('admin.patients.store'), [
            'name' => 'Example Patient',
            'gender' => 'female',
            'phone' => 'invalid-hidden-value',
        ])->assertRedirect(route('admin.patients.index'));

        $this->assertDatabaseHas('patients', [
            'name' => 'Example Patient',
            'phone' => null,
        ]);
    }

    public function test_super_admin_can_delete_a_relationship_without_patient_dependencies(): void
    {
        $user = $this->userWithRole('Super Admin', ['settings.view', 'settings.update']);
        $settings = $this->createClinicSetting();
        $fields = ClinicSetting::defaultPatientFormConfig();
        $fields['phone']['label'] = 'Primary phone';
        $relationships = ClinicSetting::defaultPatientRelationshipOptions();

        $settings->update(['patient_form_config' => [
            'fields' => $fields,
            'relationships' => $relationships,
        ]]);

        $this->actingAs($user)->delete(route('admin.patient_config.relationships.destroy', ['relationship' => 'father']))
            ->assertRedirect()
            ->assertSessionHas('success', 'Father relationship deleted.');

        $savedConfig = $settings->fresh()->patient_form_config;
        $this->assertSame('Primary phone', $savedConfig['fields']['phone']['label']);
        $this->assertNotContains('father', array_column($savedConfig['relationships'], 'value'));
        $this->assertContains('mother', array_column($savedConfig['relationships'], 'value'));
    }

    public function test_relationship_delete_is_blocked_when_active_or_soft_deleted_patients_use_it(): void
    {
        $user = $this->userWithRole('Super Admin', ['settings.view', 'settings.update']);
        $settings = $this->createClinicSetting();
        $relationships = ClinicSetting::defaultPatientRelationshipOptions();
        $settings->update(['patient_form_config' => ['relationships' => $relationships]]);
        Patient::factory()->create(['guardian_relationship' => 'father']);
        $softDeletedPatient = Patient::factory()->create(['guardian_relationship' => 'father']);
        $softDeletedPatient->delete();

        $this->actingAs($user)->delete(route('admin.patient_config.relationships.destroy', ['relationship' => 'father']))
            ->assertRedirect()
            ->assertSessionHasErrors([
                'relationshipDelete' => 'Cannot delete Father; it is used by 2 patient records. Update those records first.',
            ]);

        $this->assertContains('father', array_column($settings->fresh()->getPatientRelationshipOptions(), 'value'));
    }

    public function test_non_super_admin_cannot_delete_patient_relationship_options(): void
    {
        $user = $this->userWithRole('Receptionist', ['settings.view', 'settings.update']);
        $this->createClinicSetting();

        $this->actingAs($user)->delete(route('admin.patient_config.relationships.destroy', ['relationship' => 'father']))
            ->assertForbidden();
    }

    public function test_relationship_delete_rejects_unknown_relationship_values(): void
    {
        $user = $this->userWithRole('Super Admin', ['settings.view', 'settings.update']);
        $this->createClinicSetting();

        $this->actingAs($user)->delete(route('admin.patient_config.relationships.destroy', ['relationship' => 'not-a-relationship']))
            ->assertRedirect()
            ->assertSessionHasErrors('relationship');
    }

    private function userWithRole(string $roleName, array $permissionNames): User
    {
        $permissions = collect($permissionNames)->map(fn (string $name): Permission => Permission::firstOrCreate([
            'name' => $name,
            'guard_name' => 'web',
        ]));
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $role->givePermissionTo($permissions);
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        return $user;
    }

    private function createClinicSetting(): ClinicSetting
    {
        return ClinicSetting::create([
            'clinic_name_en' => 'Test Clinic',
            'doctor_name' => 'Test Doctor',
            'doctor_credentials' => 'MBBS',
            'address' => 'Test address',
            'phone' => '01711000000',
        ]);
    }
}
