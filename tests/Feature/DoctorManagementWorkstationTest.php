<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DoctorManagementWorkstationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $permissions = [
            'doctors.view',
            'doctors.create',
            'doctors.update',
            'doctors.delete',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        $role->givePermissionTo($permissions);

        $this->admin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $this->admin->assignRole('Super Admin');
    }

    public function test_authorized_user_can_view_doctor_directory_with_kpis(): void
    {
        Doctor::create([
            'name' => 'Dr. Fazlul Karim',
            'name_bn' => 'ডাঃ মোঃ ফজলুল করিম',
            'credentials' => 'D.H.M.S (B.H.B) Dhaka',
            'govt_reg_no' => '23941',
            'specialty' => 'Classical Homeopathy',
            'is_active' => true,
        ]);

        Doctor::create([
            'name' => 'Dr. Inactive Physician',
            'credentials' => 'MBBS',
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.doctors.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Doctors/Index')
                ->has('doctors.data', 2)
                ->where('kpis.total', 2)
                ->where('kpis.active', 1)
                ->where('kpis.inactive', 1)
            );
    }

    public function test_search_filters_doctors_by_name_degree_or_reg_no(): void
    {
        Doctor::create([
            'name' => 'Dr. Fazlul Karim',
            'credentials' => 'D.H.M.S (B.H.B)',
            'govt_reg_no' => 'BHB-23941',
            'phone' => '01754068887',
            'is_active' => true,
        ]);

        Doctor::create([
            'name' => 'Dr. Shamsul Huda',
            'credentials' => 'MBBS, FCPS',
            'govt_reg_no' => 'BMDC-98765',
            'phone' => '01811223344',
            'is_active' => true,
        ]);

        // Search by Registration Number
        $regResponse = $this->actingAs($this->admin)->get(route('admin.doctors.index', ['search' => '23941']));
        $regResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('doctors.data', 1)
                ->where('doctors.data.0.name', 'Dr. Fazlul Karim')
            );

        // Search by Degree/Credentials
        $credResponse = $this->actingAs($this->admin)->get(route('admin.doctors.index', ['search' => 'FCPS']));
        $credResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('doctors.data', 1)
                ->where('doctors.data.0.name', 'Dr. Shamsul Huda')
            );

        // Search by Phone
        $phoneResponse = $this->actingAs($this->admin)->get(route('admin.doctors.index', ['search' => '01754068887']));
        $phoneResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('doctors.data', 1)
                ->where('doctors.data.0.name', 'Dr. Fazlul Karim')
            );
    }

    public function test_status_filter_narrows_doctors(): void
    {
        Doctor::create([
            'name' => 'Dr. Active',
            'is_active' => true,
        ]);

        Doctor::create([
            'name' => 'Dr. Inactive',
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.doctors.index', ['status' => 'inactive']));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('doctors.data', 1)
                ->where('doctors.data.0.name', 'Dr. Inactive')
            );
    }

    public function test_account_filter_narrows_doctors(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);

        Doctor::create([
            'name' => 'Dr. Linked',
            'user_id' => $user->id,
            'is_active' => true,
        ]);

        Doctor::create([
            'name' => 'Dr. Unlinked',
            'user_id' => null,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.doctors.index', ['account' => 'linked']));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('doctors.data', 1)
                ->where('doctors.data.0.name', 'Dr. Linked')
            );
    }

    public function test_authorized_user_can_toggle_doctor_active_status(): void
    {
        $doctor = Doctor::create([
            'name' => 'Dr. Toggle Status',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->from(route('admin.doctors.index'))
            ->patch(route('admin.doctors.toggle-status', $doctor));

        $response->assertRedirect(route('admin.doctors.index'));
        $this->assertFalse((bool) $doctor->fresh()->is_active);

        $response2 = $this->actingAs($this->admin)
            ->from(route('admin.doctors.index'))
            ->patch(route('admin.doctors.toggle-status', $doctor));

        $response2->assertRedirect(route('admin.doctors.index'));
        $this->assertTrue((bool) $doctor->fresh()->is_active);
    }

    public function test_doctor_with_visits_cannot_be_deleted_via_destroy_endpoint(): void
    {
        $doctor = Doctor::create([
            'name' => 'Dr. Has Historical Visits',
            'is_active' => true,
        ]);

        $patient = Patient::factory()->create();
        Visit::factory()->create([
            'doctor_id' => $doctor->id,
            'patient_id' => $patient->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->from(route('admin.doctors.index'))
            ->delete(route('admin.doctors.destroy', $doctor));

        $response->assertRedirect(route('admin.doctors.index'));
        $response->assertSessionHasErrors(['doctor']);

        $this->assertDatabaseHas('doctors', ['id' => $doctor->id]);
    }

    public function test_doctor_without_visits_can_be_deleted(): void
    {
        $doctor = Doctor::create([
            'name' => 'Dr. Clean To Delete',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->from(route('admin.doctors.index'))
            ->delete(route('admin.doctors.destroy', $doctor));

        $response->assertRedirect();
        $this->assertDatabaseMissing('doctors', ['id' => $doctor->id]);
    }
}
