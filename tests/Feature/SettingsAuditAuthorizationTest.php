<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\FoodRestriction;
use App\Models\PatientNumberingProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SettingsAuditAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Mirrors the seeder: create all module.action permissions.
        $modules = [
            'patients', 'visits', 'medicines', 'symptoms', 'symptom_medicine_map',
            'appointments', 'reports', 'settings', 'users', 'roles', 'activity_logs',
        ];
        $actions = ['view', 'create', 'update', 'delete', 'export'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}"]);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctor = Role::firstOrCreate(['name' => 'Doctor']);
        $receptionist = Role::firstOrCreate(['name' => 'Receptionist']);
        $accountant = Role::firstOrCreate(['name' => 'Accountant']);

        $superAdmin->givePermissionTo(Permission::all());

        $doctor->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update', 'patients.delete',
            'visits.view', 'visits.create', 'visits.update', 'visits.delete',
            'medicines.view',
            'symptoms.view',
            'settings.view',
            'reports.view', 'reports.export',
        ]);

        $receptionist->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update',
            'visits.view',
            'medicines.view',
            'symptoms.view',
            'settings.view',
            'appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete',
        ]);

        $accountant->givePermissionTo(['reports.view']);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Test 1 & 2: Doctor / Receptionist cannot update clinic settings
    // -------------------------------------------------------------------------

    public function test_doctor_cannot_update_settings(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->put('/admin/settings', ['clinic_name_en' => 'Test Clinic'])
            ->assertStatus(403);
    }

    public function test_doctor_can_view_settings_when_granted_view_permission(): void
    {
        Role::findByName('Doctor')->givePermissionTo('clinic_settings.view');

        $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/settings')
            ->assertOk();
    }

    public function test_doctor_can_view_administration_pages_when_granted_module_permissions(): void
    {
        Role::findByName('Doctor')->givePermissionTo([
            'doctors.view',
            'prescription_options.view',
        ]);

        $doctor = $this->userWithRole('Doctor');

        $this->actingAs($doctor)->get(route('admin.doctors.index'))->assertOk();
        $this->actingAs($doctor)->get(route('admin.prescription_options.edit'))->assertOk();
    }

    public function test_doctor_profile_details_require_and_accept_the_doctors_view_permission(): void
    {
        $this->withoutVite();
        $doctorProfile = Doctor::create([
            'name' => 'Dr. Test Profile',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        $user = $this->userWithRole('Doctor');

        $this->actingAs($user)
            ->get(route('admin.doctors.show', $doctorProfile))
            ->assertForbidden();

        Role::findByName('Doctor')->givePermissionTo('doctors.view');

        $this->actingAs($user)
            ->get(route('admin.doctors.show', $doctorProfile))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Doctors/Show')
                ->where('doctor.name', 'Dr. Test Profile'));
    }

    public function test_doctor_can_update_settings_when_granted_update_permission(): void
    {
        Role::findByName('Doctor')->givePermissionTo('clinic_settings.update');

        $this->actingAs($this->userWithRole('Doctor'))
            ->put('/admin/settings', [
                'clinic_name_en' => 'Doctor Updated Clinic',
                'phone' => '01700000000',
                'address' => 'Dhaka',
                'patient_no_series' => 'A',
                'patient_no_next' => 1,
            ])
            ->assertRedirectContains('settings');

        $this->assertDatabaseHas('clinic_settings', [
            'clinic_name_en' => 'Doctor Updated Clinic',
        ]);
    }

    public function test_general_and_clinic_settings_permissions_do_not_grant_each_other(): void
    {
        $doctor = $this->userWithRole('Doctor');
        $profile = PatientNumberingProfile::factory()->create();
        Role::findByName('Doctor')->givePermissionTo('clinic_settings.update');

        $this->actingAs($doctor)
            ->put(route('admin.general_settings.profiles.update', $profile), [])
            ->assertForbidden();

        $receptionist = $this->userWithRole('Receptionist');
        Role::findByName('Receptionist')->givePermissionTo('general_settings.update');

        $this->actingAs($receptionist)
            ->put(route('admin.settings.update'), [])
            ->assertForbidden();
    }

    public function test_receptionist_cannot_update_settings(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->put('/admin/settings', ['clinic_name_en' => 'Test Clinic'])
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 3: Doctor cannot create a doctor profile
    // -------------------------------------------------------------------------

    public function test_doctor_cannot_create_doctor_profile(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->post('/admin/doctors', ['name' => 'Fake Doctor'])
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 4: Receptionist cannot create an advice item
    // -------------------------------------------------------------------------

    public function test_receptionist_cannot_create_advice_item(): void
    {
        $this->actingAs($this->userWithRole('Receptionist'))
            ->post('/admin/advice_items', ['text_en' => 'Advice text'])
            ->assertStatus(403);
    }

    public function test_symptom_medicine_map_import_requires_create_permission(): void
    {
        Role::findByName('Doctor')->givePermissionTo('symptom_medicine_map.view');

        $this->actingAs($this->userWithRole('Doctor'))
            ->post(route('admin.symptom_medicine_map.import'), [])
            ->assertForbidden();
    }

    // -------------------------------------------------------------------------
    // Test 5: Doctor cannot delete a food restriction
    // -------------------------------------------------------------------------

    public function test_doctor_cannot_delete_food_restriction(): void
    {
        // Create a food restriction as Super Admin first so a real ID exists.
        $superAdmin = $this->userWithRole('Super Admin');
        $this->actingAs($superAdmin)
            ->post('/admin/food_restrictions', [
                'text_en' => 'No sugar',
                'text_bn' => 'চিনি নিষেধ',
            ]);

        // Now try to delete as Doctor (no settings.update permission).
        $doctor = $this->userWithRole('Doctor');
        $this->actingAs($doctor)
            ->delete('/admin/food_restrictions/1')
            ->assertStatus(403);
    }

    public function test_settings_create_permission_only_allows_creating_food_restrictions(): void
    {
        Role::findByName('Doctor')->givePermissionTo('settings.create');
        $doctor = $this->userWithRole('Doctor');

        $this->actingAs($doctor)
            ->post(route('admin.food_restrictions.store'), [
                'text_en' => 'No sugar',
                'text_bn' => 'চিনি নিষেধ',
            ])
            ->assertRedirect(route('admin.food_restrictions.index'));

        $foodRestriction = FoodRestriction::firstOrFail();

        $this->actingAs($doctor)
            ->put(route('admin.food_restrictions.update', $foodRestriction), [
                'text_en' => 'No sweets',
                'text_bn' => 'মিষ্টি নিষেধ',
            ])
            ->assertForbidden();

        $this->actingAs($doctor)
            ->delete(route('admin.food_restrictions.destroy', $foodRestriction))
            ->assertForbidden();
    }

    public function test_settings_update_permission_only_allows_editing_food_restrictions(): void
    {
        Role::findByName('Doctor')->givePermissionTo('settings.update');
        $foodRestriction = FoodRestriction::create([
            'text_en' => 'No sugar',
            'text_bn' => 'চিনি নিষেধ',
        ]);
        $doctor = $this->userWithRole('Doctor');

        $this->actingAs($doctor)
            ->put(route('admin.food_restrictions.update', $foodRestriction), [
                'text_en' => 'No sweets',
                'text_bn' => 'মিষ্টি নিষেধ',
            ])
            ->assertRedirect(route('admin.food_restrictions.index'));

        $this->actingAs($doctor)
            ->post(route('admin.food_restrictions.store'), [
                'text_en' => 'No salt',
                'text_bn' => 'লবণ নিষেধ',
            ])
            ->assertForbidden();

        $this->actingAs($doctor)
            ->delete(route('admin.food_restrictions.destroy', $foodRestriction))
            ->assertForbidden();
    }

    public function test_settings_delete_permission_only_allows_deleting_food_restrictions(): void
    {
        Role::findByName('Doctor')->givePermissionTo('settings.delete');
        $foodRestriction = FoodRestriction::create([
            'text_en' => 'No sugar',
            'text_bn' => 'চিনি নিষেধ',
        ]);
        $doctor = $this->userWithRole('Doctor');

        $this->actingAs($doctor)
            ->delete(route('admin.food_restrictions.destroy', $foodRestriction))
            ->assertRedirect(route('admin.food_restrictions.index'));

        $this->assertDatabaseMissing('food_restrictions', ['id' => $foodRestriction->id]);

        $this->actingAs($doctor)
            ->post(route('admin.food_restrictions.store'), [
                'text_en' => 'No salt',
                'text_bn' => 'লবণ নিষেধ',
            ])
            ->assertForbidden();
    }

    // -------------------------------------------------------------------------
    // Test 6 & 7: Doctor and Accountant cannot view activity logs
    // -------------------------------------------------------------------------

    public function test_doctor_cannot_view_activity_logs(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/activity-logs')
            ->assertStatus(403);
    }

    public function test_accountant_cannot_view_activity_logs(): void
    {
        $this->actingAs($this->userWithRole('Accountant'))
            ->get('/admin/activity-logs')
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 8: Super Admin can view activity logs
    // -------------------------------------------------------------------------

    public function test_super_admin_can_view_activity_logs(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->get('/admin/activity-logs')
            ->assertStatus(200);
    }

    // -------------------------------------------------------------------------
    // Test 9: Accountant can view reports (reports.view still works)
    // -------------------------------------------------------------------------

    public function test_accountant_can_view_reports(): void
    {
        $this->actingAs($this->userWithRole('Accountant'))
            ->get('/admin/reports')
            ->assertStatus(200);
    }

    // -------------------------------------------------------------------------
    // Test 10: Super Admin can update clinic settings
    // -------------------------------------------------------------------------

    public function test_super_admin_can_update_settings(): void
    {
        $this->actingAs($this->userWithRole('Super Admin'))
            ->put('/admin/settings', [
                'clinic_name_en' => 'JB Homeo Hall',
                'clinic_name_bn' => 'জে বি হোমিও হল',
                'phone' => '01700000000',
                'address' => 'Sutrapur, Bogura',
                'patient_no_series' => 'A',
                'patient_no_next' => 1,
            ])
            ->assertRedirectContains('settings');
    }
}
