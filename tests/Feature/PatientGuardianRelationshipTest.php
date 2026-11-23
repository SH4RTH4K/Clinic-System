<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PatientGuardianRelationshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_specific_guardian_relationship_is_saved_when_creating_a_patient(): void
    {
        $user = $this->userWithPermission('patients.create');
        $this->createClinicSetting();

        $this->actingAs($user)->post(route('admin.patients.store'), $this->validPatientData([
            'guardian_name' => 'Rahima Begum',
            'guardian_relationship' => 'grandmother',
        ]))->assertRedirect(route('admin.patients.index'));

        $this->assertDatabaseHas('patients', [
            'name' => 'Test Patient',
            'guardian_name' => 'Rahima Begum',
            'guardian_relationship' => 'grandmother',
            'guardian_relationship_custom' => null,
        ]);
    }

    public function test_required_relationship_configuration_rejects_an_empty_selection(): void
    {
        $user = $this->userWithPermission('patients.create');
        $this->createClinicSetting();
        $settings = ClinicSetting::query()->firstOrFail();
        $fields = ClinicSetting::defaultPatientFormConfig();
        $fields['guardian_relationship']['required'] = true;
        $settings->update(['patient_form_config' => $fields]);

        $this->actingAs($user)->from(route('admin.patients.create'))
            ->post(route('admin.patients.store'), [
                'name' => 'Test Patient',
                'gender' => 'female',
                'guardian_relationship' => '',
            ])
            ->assertSessionHasErrors('guardian_relationship');

        $this->assertDatabaseMissing('patients', ['name' => 'Test Patient']);
    }

    public function test_gender_is_required_instead_of_being_assumed_for_new_patients(): void
    {
        $user = $this->userWithPermission('patients.create');
        $this->createClinicSetting();

        $this->actingAs($user)->from(route('admin.patients.create'))
            ->post(route('admin.patients.store'), ['name' => 'Test Patient'])
            ->assertSessionHasErrors('gender');

        $this->assertDatabaseMissing('patients', ['name' => 'Test Patient']);
    }

    public function test_guardian_relationship_can_be_updated(): void
    {
        $user = $this->userWithPermission('patients.update');
        $patient = Patient::factory()->create([
            'guardian_name' => 'Original Contact',
            'guardian_relationship' => 'custom',
            'guardian_relationship_custom' => 'Grandmother',
        ]);

        $this->actingAs($user)->put(route('admin.patients.update', $patient), $this->validPatientData([
            'guardian_name' => 'New Contact',
            'guardian_relationship' => 'spouse',
        ]))->assertRedirect(route('admin.patients.index'));

        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'guardian_name' => 'New Contact',
            'guardian_relationship' => 'spouse',
            'guardian_relationship_custom' => null,
        ]);
    }

    public function test_deleted_relationship_is_rejected_for_new_patients(): void
    {
        $user = $this->userWithPermission('patients.create');
        $settings = ClinicSetting::create([
            'clinic_name_en' => 'Test Clinic',
            'doctor_name' => 'Test Doctor',
            'doctor_credentials' => 'MBBS',
            'address' => 'Test address',
            'phone' => '01711000000',
        ]);
        $relationships = ClinicSetting::defaultPatientRelationshipOptions();
        $relationships = array_values(array_filter(
            $relationships,
            fn (array $relationship): bool => $relationship['value'] !== 'father',
        ));
        $settings->update(['patient_form_config' => ['relationships' => $relationships]]);

        $this->actingAs($user)->from(route('admin.patients.create'))
            ->post(route('admin.patients.store'), $this->validPatientData([
                'guardian_name' => 'Rahima Begum',
                'guardian_relationship' => 'father',
            ]))
            ->assertSessionHasErrors('guardian_relationship');

        $this->assertDatabaseMissing('patients', ['name' => 'Test Patient']);
    }

    public function test_patient_index_searches_by_guardian_name_via_general_search_query(): void
    {
        $user = $this->userWithPermission('patients.view');
        $this->createClinicSetting();

        $matchingPatient = Patient::factory()->create([
            'name' => 'Baby Rahim',
            'guardian_name' => 'Abdur Razzak',
            'phone' => '01711111111',
        ]);
        $otherPatient = Patient::factory()->create([
            'name' => 'Kamal Hossain',
            'guardian_name' => 'Fatema Begum',
            'phone' => '01722222222',
        ]);

        $this->actingAs($user)
            ->get(route('admin.patients.index', ['search' => 'Razzak']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Patients/Index')
                ->has('patients.data', 1)
                ->where('patients.data.0.id', $matchingPatient->id)
                ->where('patients.data.0.guardian_name', 'Abdur Razzak')
                ->where('filters.search', 'Razzak'));
    }

    public function test_patient_index_filters_specifically_by_guardian_name_query(): void
    {
        $user = $this->userWithPermission('patients.view');
        $this->createClinicSetting();

        $matchingPatient = Patient::factory()->create([
            'name' => 'Kamal Hossain',
            'guardian_name' => 'Fatema Begum',
        ]);
        $otherPatient = Patient::factory()->create([
            'name' => 'Baby Rahim',
            'guardian_name' => 'Abdur Razzak',
        ]);

        $this->actingAs($user)
            ->get(route('admin.patients.index', ['guardian_name' => 'Fatema']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Patients/Index')
                ->has('patients.data', 1)
                ->where('patients.data.0.id', $matchingPatient->id)
                ->where('patients.data.0.guardian_name', 'Fatema Begum')
                ->where('filters.guardian_name', 'Fatema'));
    }

    public function test_patient_async_search_endpoint_searches_by_guardian_name(): void
    {
        $user = $this->userWithPermission('patients.view');
        $this->createClinicSetting();

        $matchingPatient = Patient::factory()->create([
            'name' => 'Child Patient',
            'guardian_name' => 'Primary Guardian Razzak',
        ]);

        $response = $this->actingAs($user)
            ->getJson(route('admin.patients.search', ['q' => 'Razzak']));

        $response->assertOk()
            ->assertJsonFragment([
                'id' => $matchingPatient->id,
                'name' => 'Child Patient',
                'guardian_name' => 'Primary Guardian Razzak',
            ]);
    }

    private function userWithPermission(string $permissionName): User
    {
        $permission = Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo($permission);

        return $user;
    }

    private function createClinicSetting(): void
    {
        ClinicSetting::create([
            'clinic_name_en' => 'Test Clinic',
            'doctor_name' => 'Test Doctor',
            'doctor_credentials' => 'MBBS',
            'address' => 'Test address',
            'phone' => '01711000000',
        ]);
    }

    /** @return array<string, mixed> */
    private function validPatientData(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test Patient',
            'guardian_name' => null,
            'guardian_relationship' => null,
            'gender' => 'female',
        ], $overrides);
    }
}
