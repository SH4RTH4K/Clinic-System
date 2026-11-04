<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_does_not_receive_clinical_data_without_explicit_chart_permission(): void
    {
        $this->createDashboardRecords();
        $superAdmin = $this->userWithPermissions('Super Admin');

        $this->actingAs($superAdmin)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('access.patients', true)
                ->where('access.visits', false)
                ->where('access.appointments', true)
                ->where('metrics.total_patients', 1)
                ->missing('metrics.todays_visits')
                ->where('metrics.pending_requests', 1)
                ->missing('recent_visits')
                ->where('recent_requests.0.name', 'Appointment Contact')
                ->where('recent_requests.0.phone', '01700000000'));
    }

    public function test_doctor_gets_patient_and_visit_data_but_not_appointment_contacts_without_permission(): void
    {
        $this->createDashboardRecords();
        $doctor = $this->userWithPermissions('Doctor', ['patients.view', 'visits.view']);

        $this->actingAs($doctor)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('access.patients', true)
                ->where('access.visits', true)
                ->where('access.appointments', false)
                ->where('metrics.total_patients', 1)
                ->where('metrics.todays_visits', 1)
                ->where('recent_visits.0.patient.name', 'Dashboard Patient')
                ->where('recent_visits.0.chief_complaint', 'Sensitive clinical complaint')
                ->missing('appointment_status')
                ->missing('recent_requests')
                ->missing('metrics.pending_requests'));
    }

    public function test_visit_permission_does_not_reveal_patient_identity_without_patient_permission(): void
    {
        $this->createDashboardRecords();
        $doctor = $this->userWithPermissions('Doctor', ['visits.view']);

        $this->actingAs($doctor)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('access.patients', false)
                ->where('access.visits', true)
                ->where('recent_visits.0.patient', null)
                ->where('recent_visits.0.chief_complaint', 'Sensitive clinical complaint')
                ->missing('recent_visits.0.patient_id')
                ->missing('metrics.total_patients'));
    }

    public function test_receptionist_gets_patient_and_appointment_data_without_clinical_visit_details(): void
    {
        $this->createDashboardRecords();
        $receptionist = $this->userWithPermissions('Receptionist', ['patients.view', 'appointments.view']);

        $this->actingAs($receptionist)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('access.patients', true)
                ->where('access.visits', false)
                ->where('access.appointments', true)
                ->where('metrics.total_patients', 1)
                ->where('metrics.pending_requests', 1)
                ->where('recent_requests.0.name', 'Appointment Contact')
                ->where('recent_requests.0.phone', '01700000000')
                ->missing('recent_visits')
                ->missing('weekly_visits')
                ->missing('top_medicines')
                ->missing('metrics.todays_visits'));
    }

    public function test_accountant_can_receive_authorized_non_sensitive_metrics_only(): void
    {
        $this->createDashboardRecords();
        Doctor::create(['name' => 'Dashboard Doctor', 'is_active' => true, 'sort_order' => 1]);
        Medicine::create(['name' => 'Dashboard Medicine', 'potency' => '30C', 'form' => 'pills', 'is_active' => true]);
        $accountant = $this->userWithPermissions('Accountant', ['reports.view', 'doctors.view', 'medicines.view']);

        $this->actingAs($accountant)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('access.patients', false)
                ->where('access.visits', false)
                ->where('access.appointments', false)
                ->where('access.doctors', true)
                ->where('access.medicines', true)
                ->where('metrics.active_doctors', 1)
                ->where('metrics.total_medicines', 1)
                ->missing('metrics.total_patients')
                ->missing('metrics.todays_visits')
                ->missing('metrics.pending_requests')
                ->missing('recent_visits')
                ->missing('recent_requests'));
    }

    public function test_user_without_relevant_permissions_cannot_retrieve_protected_dashboard_data(): void
    {
        $this->createDashboardRecords();
        $user = $this->userWithPermissions('Limited Staff', ['reports.view']);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics', [])
                ->where('access.patients', false)
                ->where('access.visits', false)
                ->where('access.appointments', false)
                ->missing('recent_visits')
                ->missing('recent_requests')
                ->missing('appointment_status')
                ->missing('weekly_visits')
                ->missing('top_medicines'));
    }

    /** @param array<int, string> $permissions */
    private function userWithPermissions(string $roleName, array $permissions = []): User
    {
        $role = Role::firstOrCreate(['name' => $roleName]);

        if ($roleName === 'Doctor' && in_array('visits.view', $permissions, true)) {
            $permissions[] = 'clinical_records.view';
        }

        foreach ($permissions as $permissionName) {
            $permission = Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
            $role->givePermissionTo($permission);
        }

        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        return $user;
    }

    private function createDashboardRecords(): void
    {
        $patient = Patient::factory()->create(['name' => 'Dashboard Patient']);

        Visit::factory()->for($patient)->create([
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Sensitive clinical complaint',
            'status' => 'finalized',
        ]);

        AppointmentRequest::create([
            'name' => 'Appointment Contact',
            'phone' => '01700000000',
            'preferred_date' => now()->toDateString(),
            'preferred_time' => '10:00:00',
            'status' => 'pending',
        ]);
    }
}
