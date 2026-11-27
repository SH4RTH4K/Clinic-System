<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\DoctorSchedule;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DoctorScheduleWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'calendar.view',
            'calendar.manage',
            'doctors.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdmin->givePermissionTo(Permission::all());
    }

    public function test_unauthenticated_user_cannot_access_doctor_schedules(): void
    {
        $response = $this->get(route('admin.doctor_schedules.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_unauthorized_user_receives_403_forbidden(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);

        $response = $this->actingAs($user)->get(route('admin.doctor_schedules.index'));
        $response->assertForbidden();
    }

    public function test_super_admin_can_view_doctor_schedules_with_kpis(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        $doctor = Doctor::factory()->create(['name' => 'Dr. Fazlul Karim', 'is_active' => true]);

        DoctorSchedule::create([
            'doctor_id' => $doctor->id,
            'day_of_week' => 0, // Sunday
            'start_time' => '09:00',
            'end_time' => '14:00',
            'chamber_no' => 'Chamber 1',
            'slot_duration_minutes' => 15,
            'max_patients' => 25,
            'is_active' => true,
        ]);

        DoctorLeave::create([
            'doctor_id' => $doctor->id,
            'leave_date' => Carbon::tomorrow()->toDateString(),
            'reason' => 'Scheduled Holiday',
        ]);

        $response = $this->actingAs($superAdmin)->get(route('admin.doctor_schedules.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Calendar/Schedules')
            ->has('doctors')
            ->has('selectedDoctor')
            ->has('days')
            ->has('kpis', fn (Assert $kpi) => $kpi
                ->has('total_doctors')
                ->has('active_days')
                ->has('weekly_hours')
                ->has('assigned_chamber')
                ->has('upcoming_leaves')
            )
        );
    }

    public function test_user_with_calendar_manage_can_update_weekly_schedules(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['calendar.view', 'calendar.manage']);

        $doctor = Doctor::factory()->create(['is_active' => true]);

        $response = $this->actingAs($user)->put(route('admin.doctor_schedules.update', $doctor), [
            'schedules' => [
                [
                    'day_of_week' => 0,
                    'start_time' => '10:00',
                    'end_time' => '16:00',
                    'chamber_no' => 'Chamber 2',
                    'slot_duration_minutes' => 20,
                    'max_patients' => 30,
                    'is_active' => true,
                ],
                [
                    'day_of_week' => 1,
                    'start_time' => '10:00',
                    'end_time' => '16:00',
                    'chamber_no' => 'Chamber 2',
                    'slot_duration_minutes' => 20,
                    'max_patients' => 30,
                    'is_active' => true,
                ],
            ],
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('doctor_schedules', [
            'doctor_id' => $doctor->id,
            'day_of_week' => 0,
            'start_time' => '10:00',
            'chamber_no' => 'Chamber 2',
            'slot_duration_minutes' => 20,
            'max_patients' => 30,
        ]);
    }

    public function test_user_can_store_single_day_leave(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['calendar.view', 'calendar.manage']);

        $doctor = Doctor::factory()->create(['is_active' => true]);
        $targetDate = Carbon::now()->addDays(5)->toDateString();

        $response = $this->actingAs($user)->post(route('admin.doctor_schedules.leaves.store', $doctor), [
            'leave_date' => $targetDate,
            'reason' => 'Annual Conference',
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('doctor_leaves', [
            'doctor_id' => $doctor->id,
            'reason' => 'Annual Conference',
        ]);
        $this->assertEquals($targetDate, DoctorLeave::where('doctor_id', $doctor->id)->first()->leave_date->toDateString());
    }

    public function test_user_can_store_multi_day_leave_date_range(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['calendar.view', 'calendar.manage']);

        $doctor = Doctor::factory()->create(['is_active' => true]);
        $startDate = Carbon::now()->addDays(10)->toDateString();
        $endDate = Carbon::now()->addDays(12)->toDateString();

        $response = $this->actingAs($user)->post(route('admin.doctor_schedules.leaves.store', $doctor), [
            'leave_date' => $startDate,
            'leave_date_end' => $endDate,
            'reason' => 'Eid Holiday Vacation',
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseCount('doctor_leaves', 3);
        $this->assertDatabaseHas('doctor_leaves', [
            'doctor_id' => $doctor->id,
            'reason' => 'Eid Holiday Vacation',
        ]);
        $createdDates = DoctorLeave::where('doctor_id', $doctor->id)->pluck('leave_date')->map(fn ($d) => $d->toDateString())->all();
        $this->assertContains($startDate, $createdDates);
        $this->assertContains($endDate, $createdDates);
    }

    public function test_conflict_warning_triggered_when_doctor_has_bookings_on_leave_date(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['calendar.view', 'calendar.manage']);

        $doctor = Doctor::factory()->create(['is_active' => true]);
        $patient = Patient::factory()->create();
        $leaveDate = Carbon::now()->addDays(3)->toDateString();

        // Create an active queue token for the doctor on that date
        PatientQueueToken::create([
            'token_number' => 1,
            'token_code' => 'T-001',
            'token_date' => $leaveDate,
            'patient_id' => $patient->id,
            'patient_name' => $patient->name,
            'doctor_id' => $doctor->id,
            'service_room' => 'Chamber 1',
            'status' => 'waiting',
        ]);

        $response = $this->actingAs($user)->post(route('admin.doctor_schedules.leaves.store', $doctor), [
            'leave_date' => $leaveDate,
            'reason' => 'Personal Leave',
        ]);

        $response->assertSessionHas('warning');
        $this->assertStringContainsString('Note: 1 active booking(s) exist on these dates', session('warning'));
    }

    public function test_user_can_delete_doctor_leave(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['calendar.view', 'calendar.manage']);

        $doctor = Doctor::factory()->create(['is_active' => true]);
        $leave = DoctorLeave::create([
            'doctor_id' => $doctor->id,
            'leave_date' => Carbon::tomorrow()->toDateString(),
            'reason' => 'To Be Removed',
        ]);

        $response = $this->actingAs($user)->delete(route('admin.doctor_schedules.leaves.destroy', $leave));

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('doctor_leaves', [
            'id' => $leave->id,
        ]);
    }
}
