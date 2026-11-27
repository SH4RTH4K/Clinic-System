<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class FastTrackAppointmentBookingTest extends TestCase
{
    use RefreshDatabase;

    private User $staff;

    private User $unauthorizedUser;

    private Patient $patient;

    private Doctor $doctor;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'appointments.view',
            'appointments.create',
            'appointments.update',
            'patients.view',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $staffRole = Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web']);
        $staffRole->givePermissionTo($permissions);

        $guestRole = Role::firstOrCreate(['name' => 'Guest', 'guard_name' => 'web']);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->staff = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->staff->assignRole('Staff');

        $this->unauthorizedUser = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->unauthorizedUser->assignRole('Guest');

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Healthcare',
            'clinic_name_bn' => 'রেমেডিক হেলথকেয়ার',
            'doctor_name' => 'Dr. Rahman',
            'doctor_credentials' => 'BHMS, MD',
            'address' => 'Dhaka, Bangladesh',
            'phone' => '01888000000',
            'sms_config' => array_merge(ClinicSetting::defaultSmsConfig(), [
                'sms_enabled' => true,
                'auto_sms_appointments' => true,
            ]),
        ]);

        $this->doctor = Doctor::factory()->create([
            'name' => 'Fazlul Karim',
            'specialty' => 'Classical Homeopathy',
        ]);

        DoctorSchedule::create([
            'doctor_id' => $this->doctor->id,
            'day_of_week' => 1, // Monday
            'start_time' => '09:00:00',
            'end_time' => '14:00:00',
            'service_room' => 'Chamber 1',
            'is_active' => true,
        ]);

        $this->patient = Patient::factory()->create([
            'name' => 'Mohammad Rahim',
            'phone' => '01711223344',
            'gender' => 'male',
            'patient_code' => 'P-2026-0001',
        ]);
    }

    public function test_unauthorized_user_without_permission_cannot_access_booking_terminal(): void
    {
        $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.appointment_requests.create'))
            ->assertForbidden();

        $this->actingAs($this->unauthorizedUser)
            ->post(route('admin.appointment_requests.store'), [
                'name' => 'Test Patient',
                'phone' => '01711223344',
                'source' => 'phone',
            ])
            ->assertForbidden();
    }

    public function test_authorized_staff_can_view_appointment_booking_terminal_with_roster_and_recent_patients(): void
    {
        $response = $this->actingAs($this->staff)
            ->get(route('admin.appointment_requests.create'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/AppointmentRequests/Create')
            ->has('doctors', 1, fn (Assert $d) => $d
                ->where('name', 'Fazlul Karim')
                ->has('schedules', 1)
                ->etc())
            ->has('recentPatients')
        );
    }

    public function test_staff_can_record_pending_appointment_request_with_registered_patient(): void
    {
        $payload = [
            'name' => $this->patient->name,
            'phone' => $this->patient->phone,
            'preferred_date' => now()->addDays(2)->toDateString(),
            'preferred_time' => '10:30',
            'source' => 'phone',
            'message' => 'Requested morning slot for stomach follow-up',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'schedule_immediately' => false,
        ];

        $response = $this->actingAs($this->staff)
            ->post(route('admin.appointment_requests.store'), $payload);

        $response->assertRedirect(route('admin.appointment_requests.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('appointment_requests', [
            'name' => 'Mohammad Rahim',
            'phone' => '01711223344',
            'status' => 'pending',
            'converted_patient_id' => $this->patient->id,
            'created_by' => $this->staff->id,
        ]);

        $this->assertDatabaseHas('appointment_request_events', [
            'event_type' => 'created',
            'new_status' => 'pending',
            'performed_by' => $this->staff->id,
        ]);
    }

    public function test_staff_can_fast_track_confirm_and_schedule_immediately_with_sms_notification(): void
    {
        $targetDate = now()->addDay()->toDateString();
        $payload = [
            'name' => $this->patient->name,
            'phone' => $this->patient->phone,
            'preferred_date' => $targetDate,
            'preferred_time' => '11:00',
            'source' => 'walk_in',
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'schedule_immediately' => true,
            'scheduled_date' => $targetDate,
            'scheduled_time' => '11:00',
        ];

        $response = $this->actingAs($this->staff)
            ->post(route('admin.appointment_requests.store'), $payload);

        $response->assertRedirect(route('admin.appointment_requests.index'));
        $response->assertSessionHas('success', 'Appointment confirmed and scheduled successfully.');

        $this->assertDatabaseHas('appointment_requests', [
            'name' => 'Mohammad Rahim',
            'status' => 'scheduled',
            'scheduled_time' => '11:00',
            'handled_by' => $this->staff->id,
            'converted_patient_id' => $this->patient->id,
        ]);

        $this->assertDatabaseHas('appointment_request_events', [
            'event_type' => 'scheduled',
            'new_status' => 'scheduled',
            'performed_by' => $this->staff->id,
        ]);

        // Automated SMS was dispatched to patient
        $this->assertDatabaseHas('patient_notifications', [
            'recipient_phone' => '01711223344',
            'event_type' => 'appointment_confirmation',
            'status' => 'sent',
        ]);
    }
}
