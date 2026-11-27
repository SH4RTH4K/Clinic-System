<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\DoctorSchedule;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CalendarWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'calendar.view',
            'calendar.manage',
            'doctors.view',
            'visits.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdmin->givePermissionTo(Permission::all());
    }

    public function test_unauthenticated_user_cannot_access_calendar(): void
    {
        $response = $this->get(route('admin.calendar.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_unauthorized_user_receives_403_forbidden(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);

        $response = $this->actingAs($user)->get(route('admin.calendar.index'));
        $response->assertForbidden();
    }

    public function test_super_admin_can_view_calendar_with_kpis_and_doctor_shifts(): void
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

        $thisMonth = Carbon::today()->format('Y-m');

        $response = $this->actingAs($superAdmin)->get(route('admin.calendar.index', ['month' => $thisMonth]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Calendar/Index')
            ->has('doctors')
            ->has('appointments')
            ->has('visits')
            ->has('leaves')
            ->has('doctorShifts')
            ->has('kpis', fn (Assert $kpi) => $kpi
                ->has('total_appointments')
                ->has('total_visits')
                ->has('total_leaves')
                ->has('today_activity')
                ->has('active_doctors')
            )
            ->has('filters')
            ->has('startDate')
            ->has('endDate')
        );
    }

    public function test_calendar_search_filters_matching_appointments(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        $targetDate = Carbon::today()->toDateString();

        AppointmentRequest::create([
            'name' => 'Rahim Chowdhury',
            'phone' => '01711999888',
            'scheduled_date' => $targetDate,
            'scheduled_time' => '10:00:00',
            'status' => 'scheduled',
            'preferred_date' => $targetDate,
        ]);

        AppointmentRequest::create([
            'name' => 'Karim Hasan',
            'phone' => '01822334455',
            'scheduled_date' => $targetDate,
            'scheduled_time' => '11:00:00',
            'status' => 'scheduled',
            'preferred_date' => $targetDate,
        ]);

        $response = $this->actingAs($superAdmin)->get(route('admin.calendar.index', [
            'search' => 'Rahim',
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('appointments', 1)
            ->where('appointments.0.name', 'Rahim Chowdhury')
        );
    }

    public function test_calendar_filter_by_doctor_works(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        $doctorA = Doctor::factory()->create(['name' => 'Dr. Alpha', 'is_active' => true]);
        $doctorB = Doctor::factory()->create(['name' => 'Dr. Beta', 'is_active' => true]);
        $patient = Patient::factory()->create();

        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctorA->id,
            'visit_date' => Carbon::today()->toDateString(),
            'status' => 'completed',
        ]);

        $responseDoctorA = $this->actingAs($superAdmin)->get(route('admin.calendar.index', [
            'doctor_id' => $doctorA->id,
        ]));

        $responseDoctorA->assertOk();
        $responseDoctorA->assertInertia(fn (Assert $page) => $page
            ->has('visits', 1)
            ->where('visits.0.id', $visit->id)
        );

        $responseDoctorB = $this->actingAs($superAdmin)->get(route('admin.calendar.index', [
            'doctor_id' => $doctorB->id,
        ]));

        $responseDoctorB->assertOk();
        $responseDoctorB->assertInertia(fn (Assert $page) => $page
            ->has('visits', 0)
        );
    }

    public function test_calendar_json_events_feed_returns_valid_payload(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        $doctor = Doctor::factory()->create(['is_active' => true]);
        $leaveDate = Carbon::today()->toDateString();

        DoctorLeave::create([
            'doctor_id' => $doctor->id,
            'leave_date' => $leaveDate,
            'reason' => 'National Holiday',
        ]);

        $response = $this->actingAs($superAdmin)->getJson(route('admin.calendar.events', [
            'start' => Carbon::today()->startOfMonth()->toDateString(),
            'end' => Carbon::today()->endOfMonth()->toDateString(),
        ]));

        $response->assertOk();
        $response->assertJsonStructure([
            'events' => [
                '*' => ['id', 'type', 'title', 'date', 'status'],
            ],
        ]);
    }
}
