<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Models\User;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class QueueManagementAndCalendarTest extends TestCase
{
    use RefreshDatabase;

    private User $staff;

    private User $doctorUser;

    private Doctor $doctor;

    private User $unauthorizedUser;

    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'queue.view',
            'queue.manage',
            'calendar.view',
            'calendar.manage',
            'patients.view',
            'visits.view',
            'appointments.view',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $receptionistRole->givePermissionTo($permissions);

        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo($permissions);

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->doctorUser = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->doctorUser->assignRole('Doctor');

        $this->doctor = Doctor::factory()->create([
            'user_id' => $this->doctorUser->id,
            'name' => 'Dr. Shahedur Rahman',
            'specialty' => 'Homeopathy & General Practice',
            'credentials' => 'BHMS, DHMS',
            'is_active' => true,
        ]);

        $this->staff = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->staff->assignRole('Receptionist');

        $this->unauthorizedUser = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $this->patient = Patient::factory()->create([
            'name' => 'Md. Rafiqul Islam',
            'phone' => '01711223344',
        ]);

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'clinic_name_bn' => 'রেমেডিক হেলথ',
            'doctor_name' => 'Dr. Shahedur Rahman',
            'doctor_credentials' => 'BHMS, DHMS',
            'address' => 'Dhaka, Bangladesh',
            'phone' => '01711223344',
            'practice_type' => 'integrative_dual',
        ]);
    }

    public function test_can_issue_queue_token_with_daily_sequential_code(): void
    {
        $response1 = $this->actingAs($this->staff)->post(route('admin.queue.tokens.store'), [
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'service_room' => 'Chamber 1',
            'priority' => 'normal',
        ]);

        $response1->assertRedirect();
        $this->assertDatabaseHas('patient_queue_tokens', [
            'token_number' => 1,
            'token_code' => 'T-001',
            'patient_id' => $this->patient->id,
            'patient_name' => 'Md. Rafiqul Islam',
            'status' => 'waiting',
        ]);

        // Issue a second walk-in token
        $response2 = $this->actingAs($this->staff)->post(route('admin.queue.tokens.store'), [
            'patient_name' => 'Walk-in Patient',
            'patient_phone' => '01899887766',
            'doctor_id' => $this->doctor->id,
            'service_room' => 'Chamber 1',
            'priority' => 'urgent',
        ]);

        $response2->assertRedirect();
        $this->assertDatabaseHas('patient_queue_tokens', [
            'token_number' => 2,
            'token_code' => 'T-002',
            'patient_name' => 'Walk-in Patient',
            'priority' => 'urgent',
            'status' => 'waiting',
        ]);
    }

    public function test_token_lifecycle_calling_consultation_completion(): void
    {
        $token1 = PatientQueueToken::factory()->create([
            'token_number' => 1,
            'token_code' => 'T-001',
            'token_date' => Carbon::today(),
            'doctor_id' => $this->doctor->id,
            'status' => 'waiting',
        ]);

        $token2 = PatientQueueToken::factory()->create([
            'token_number' => 2,
            'token_code' => 'T-002',
            'token_date' => Carbon::today(),
            'doctor_id' => $this->doctor->id,
            'status' => 'waiting',
        ]);

        // 1. Call Token 1
        $callResponse = $this->actingAs($this->staff)->post(route('admin.queue.tokens.call', $token1->id));
        $callResponse->assertRedirect();
        $this->assertEquals('calling', $token1->fresh()->status);
        $this->assertNotNull($token1->fresh()->called_at);

        // 2. Calling Token 2 resets Token 1 back to waiting
        $this->actingAs($this->staff)->post(route('admin.queue.tokens.call', $token2->id));
        $this->assertEquals('waiting', $token1->fresh()->status);
        $this->assertEquals('calling', $token2->fresh()->status);

        // 3. Recall Token 2
        $initialCalledAt = $token2->fresh()->called_at;
        $this->actingAs($this->staff)->post(route('admin.queue.tokens.recall', $token2->id));
        $this->assertEquals('calling', $token2->fresh()->status);

        // 4. Start consultation for Token 2
        $this->actingAs($this->staff)->post(route('admin.queue.tokens.start_consultation', $token2->id));
        $this->assertEquals('in_consultation', $token2->fresh()->status);
        $this->assertNotNull($token2->fresh()->started_at);

        // 5. Complete Token 2
        $this->actingAs($this->staff)->post(route('admin.queue.tokens.complete', $token2->id));
        $this->assertEquals('completed', $token2->fresh()->status);
        $this->assertNotNull($token2->fresh()->completed_at);

        // 6. Skip Token 1
        $this->actingAs($this->staff)->post(route('admin.queue.tokens.skip', $token1->id));
        $this->assertEquals('skipped', $token1->fresh()->status);
    }

    public function test_patient_name_masking_for_waiting_room_privacy(): void
    {
        $this->assertEquals('M**. R****l I***m', PatientQueueToken::maskName('Md. Rafiqul Islam'));
        $this->assertEquals('R***m', PatientQueueToken::maskName('Rahim'));
        $this->assertEquals('J**n D**e', PatientQueueToken::maskName('John Doe'));
        $this->assertEquals('Anonymous', PatientQueueToken::maskName(''));

        $token = PatientQueueToken::factory()->create([
            'patient_name' => 'Md. Rafiqul Islam',
        ]);

        $this->assertEquals('M**. R****l I***m', $token->masked_patient_name);
    }

    public function test_waiting_room_live_tv_display_and_json_api(): void
    {
        PatientQueueToken::factory()->create([
            'token_number' => 1,
            'token_code' => 'T-001',
            'token_date' => Carbon::today(),
            'doctor_id' => $this->doctor->id,
            'status' => 'calling',
            'called_at' => Carbon::now(),
        ]);

        PatientQueueToken::factory()->create([
            'token_number' => 2,
            'token_code' => 'T-002',
            'token_date' => Carbon::today(),
            'doctor_id' => $this->doctor->id,
            'status' => 'waiting',
        ]);

        // Public TV screen view
        $displayResponse = $this->get(route('queue.display'));
        $displayResponse->assertOk();

        // Real-time JSON API
        $liveResponse = $this->getJson(route('queue.live_state'));
        $liveResponse->assertOk()
            ->assertJsonStructure([
                'date',
                'now_calling',
                'in_consultation',
                'next_in_line',
                'counters' => ['total', 'waiting', 'calling', 'in_consultation', 'completed'],
                'doctors',
            ]);

        $this->assertEquals(1, $liveResponse->json('counters.calling'));
        $this->assertEquals(1, $liveResponse->json('counters.waiting'));
    }

    public function test_doctor_workbench_and_printable_slip(): void
    {
        $token = PatientQueueToken::factory()->create([
            'token_number' => 1,
            'token_code' => 'T-001',
            'token_date' => Carbon::today(),
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'status' => 'calling',
        ]);

        // Workbench access
        $workbenchResponse = $this->actingAs($this->doctorUser)->get(route('admin.queue.workbench'));
        $workbenchResponse->assertOk();

        // Print slip
        $printResponse = $this->actingAs($this->staff)->get(route('admin.queue.tokens.print', $token->id));
        $printResponse->assertOk();
    }

    public function test_doctor_schedule_and_leave_management(): void
    {
        // 1. Update weekly schedule for doctor
        $schedulePayload = [
            'schedules' => [
                [
                    'day_of_week' => 0,
                    'start_time' => '09:00',
                    'end_time' => '13:00',
                    'chamber_no' => 'Chamber 1',
                    'slot_duration_minutes' => 15,
                    'max_patients' => 30,
                    'is_active' => true,
                ],
                [
                    'day_of_week' => 1,
                    'start_time' => '14:00',
                    'end_time' => '18:00',
                    'chamber_no' => 'Chamber 2',
                    'slot_duration_minutes' => 20,
                    'max_patients' => 20,
                    'is_active' => true,
                ],
            ],
        ];

        $scheduleResponse = $this->actingAs($this->staff)->put(
            route('admin.doctor_schedules.update', $this->doctor->id),
            $schedulePayload
        );
        $scheduleResponse->assertRedirect();

        $this->assertDatabaseHas('doctor_schedules', [
            'doctor_id' => $this->doctor->id,
            'day_of_week' => 0,
            'chamber_no' => 'Chamber 1',
        ]);

        $this->assertDatabaseHas('doctor_schedules', [
            'doctor_id' => $this->doctor->id,
            'day_of_week' => 1,
            'chamber_no' => 'Chamber 2',
        ]);

        // 2. Record leave
        $leaveResponse = $this->actingAs($this->staff)->post(
            route('admin.doctor_schedules.leaves.store', $this->doctor->id),
            [
                'leave_date' => '2026-12-25',
                'reason' => 'Winter Holiday',
            ]
        );
        $leaveResponse->assertRedirect();

        $this->assertDatabaseHas('doctor_leaves', [
            'doctor_id' => $this->doctor->id,
            'reason' => 'Winter Holiday',
        ]);
        $this->assertEquals('2026-12-25', Carbon::parse(DoctorLeave::where('doctor_id', $this->doctor->id)->first()->leave_date)->toDateString());

        // 3. Delete leave
        $leave = DoctorLeave::where('doctor_id', $this->doctor->id)->first();
        $deleteLeaveResponse = $this->actingAs($this->staff)->delete(
            route('admin.doctor_schedules.leaves.destroy', $leave->id)
        );
        $deleteLeaveResponse->assertRedirect();
        $this->assertDatabaseMissing('doctor_leaves', ['id' => $leave->id]);
    }

    public function test_calendar_index_and_events_api(): void
    {
        DoctorLeave::create([
            'doctor_id' => $this->doctor->id,
            'leave_date' => Carbon::today()->toDateString(),
            'reason' => 'Annual Conference',
        ]);

        AppointmentRequest::create([
            'name' => 'Rahim Chowdhury',
            'phone' => '01700112233',
            'scheduled_date' => Carbon::today(),
            'scheduled_time' => '10:00:00',
            'status' => 'scheduled',
        ]);

        Visit::factory()->create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => Carbon::today(),
            'chief_complaint' => 'Chronic migraine',
            'status' => 'finalized',
            'created_by' => $this->doctorUser->id,
        ]);

        // Calendar page
        $calendarResponse = $this->actingAs($this->staff)->get(route('admin.calendar.index'));
        $calendarResponse->assertOk();

        // Calendar JSON events feed
        $eventsResponse = $this->actingAs($this->staff)->getJson(route('admin.calendar.events'));
        $eventsResponse->assertOk()
            ->assertJsonStructure(['events']);

        $events = $eventsResponse->json('events');
        $this->assertCount(3, $events);

        // Filtered by specific doctor
        $doctorCalendarResponse = $this->actingAs($this->staff)->get(route('admin.calendar.index', ['doctor_id' => $this->doctor->id]));
        $doctorCalendarResponse->assertOk();

        $filteredEventsResponse = $this->actingAs($this->staff)->getJson(route('admin.calendar.events', ['doctor_id' => $this->doctor->id]));
        $filteredEventsResponse->assertOk();
        $filteredEvents = $filteredEventsResponse->json('events');
        $this->assertCount(2, $filteredEvents); // Visit + Leave (appointment is clinic-wide)
    }

    public function test_can_render_queue_token_create_page(): void
    {
        $response = $this->actingAs($this->staff)->get(route('admin.queue.tokens.create'));
        $response->assertOk();
    }

    public function test_unauthorized_user_cannot_access_queue_or_calendar(): void
    {
        $queueResponse = $this->actingAs($this->unauthorizedUser)->get(route('admin.queue.index'));
        $queueResponse->assertForbidden();

        $calendarResponse = $this->actingAs($this->unauthorizedUser)->get(route('admin.calendar.index'));
        $calendarResponse->assertForbidden();

        $issueResponse = $this->actingAs($this->unauthorizedUser)->post(route('admin.queue.tokens.store'), [
            'patient_name' => 'Unauthorized Patient',
            'priority' => 'normal',
        ]);
        $issueResponse->assertForbidden();
    }
}
