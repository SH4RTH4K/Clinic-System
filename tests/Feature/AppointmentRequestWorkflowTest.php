<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\AppointmentRequestEvent;
use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\PatientNumberingProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AppointmentRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();

        foreach (['appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete'] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web'])
            ->givePermissionTo(['appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete']);
        Role::firstOrCreate(['name' => 'Accountant', 'guard_name' => 'web'])
            ->givePermissionTo([]);
        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    }

    public function test_public_contact_page_links_to_separate_appointment_request_page(): void
    {
        $this->get(route('contact'))
            ->assertOk()
            ->assertSee('Contact Us')
            ->assertSee(route('appointment.request.form'))
            ->assertDontSee('Preferred Date')
            ->assertDontSee('name="preferred_date"', false);

        $this->get(route('appointment.request.form'))
            ->assertOk()
            ->assertSee('Appointment Request')
            ->assertSee('name="preferred_date"', false)
            ->assertSee('name="preferred_time"', false)
            ->assertSee('action="'.route('appointment.store').'"', false);
    }

    public function test_receptionist_can_open_staff_appointment_intake_form(): void
    {
        $receptionist = $this->userWithRole('Receptionist');

        $this->actingAs($receptionist)
            ->get(route('admin.appointment_requests.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AppointmentRequests/Create'));
    }

    public function test_receptionist_records_phone_request_with_creator_and_history(): void
    {
        $this->travelTo('2026-11-08 09:00:00');
        $receptionist = $this->userWithRole('Receptionist');

        $response = $this->actingAs($receptionist)
            ->post(route('admin.appointment_requests.store'), [
                'name' => 'Synthetic Caller',
                'phone' => '01700000000',
                'preferred_date' => '2026-11-10',
                'preferred_time' => '10:30',
                'message' => 'Asked to book by phone.',
                'source' => 'phone',
                'status' => 'scheduled',
                'handled_by' => 9999,
            ]);

        $appointmentRequest = AppointmentRequest::query()->where('name', 'Synthetic Caller')->firstOrFail();

        $response->assertRedirect(route('admin.appointment_requests.index'));
        $this->assertSame('phone', $appointmentRequest->source);
        $this->assertSame($receptionist->id, $appointmentRequest->created_by);
        $this->assertSame('pending', $appointmentRequest->status);
        $this->assertNull($appointmentRequest->scheduled_date);
        $this->assertNull($appointmentRequest->handled_by);
        $this->assertDatabaseHas('appointment_request_events', [
            'appointment_request_id' => $appointmentRequest->id,
            'performed_by' => $receptionist->id,
            'performed_by_name' => $receptionist->name,
            'event_type' => 'created',
            'new_status' => 'pending',
        ]);
    }

    public function test_receptionist_can_schedule_and_reschedule_without_overwriting_requested_slot(): void
    {
        $this->travelTo('2026-11-08 09:00:00');
        $receptionist = $this->userWithRole('Receptionist');
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Patient',
            'phone' => '01700000000',
            'preferred_date' => '2026-11-09',
            'preferred_time' => '09:00:00',
            'source' => 'website',
            'status' => 'pending',
        ]);

        $scheduledResponse = $this->actingAs($receptionist)
            ->put(route('admin.appointment_requests.update', $appointmentRequest), [
                'status' => 'scheduled',
                'scheduled_date' => '2026-11-10',
                'scheduled_time' => '11:00',
            ]);

        $scheduledResponse->assertRedirect(route('admin.appointment_requests.edit', $appointmentRequest));
        $appointmentRequest->refresh();
        $this->assertSame('2026-11-09', $appointmentRequest->preferred_date->toDateString());
        $this->assertSame('09:00:00', $appointmentRequest->preferred_time);
        $this->assertSame('scheduled', $appointmentRequest->status);
        $this->assertSame('2026-11-10', $appointmentRequest->scheduled_date->toDateString());
        $this->assertSame($receptionist->id, $appointmentRequest->handled_by);
        $scheduledEvent = AppointmentRequestEvent::query()
            ->where('appointment_request_id', $appointmentRequest->id)
            ->where('event_type', 'scheduled')
            ->firstOrFail();
        $this->assertSame('2026-11-10', $scheduledEvent->new_scheduled_date->toDateString());
        $this->assertSame('11:00', substr((string) $scheduledEvent->new_scheduled_time, 0, 5));

        $this->actingAs($receptionist)
            ->put(route('admin.appointment_requests.update', $appointmentRequest), [
                'status' => 'scheduled',
                'scheduled_date' => '2026-11-11',
                'scheduled_time' => '12:30',
            ])
            ->assertSessionHasErrors('reason');

        $this->assertSame('2026-11-10', $appointmentRequest->fresh()->scheduled_date->toDateString());
        $this->assertDatabaseCount('appointment_request_events', 1);

        $this->actingAs($receptionist)
            ->put(route('admin.appointment_requests.update', $appointmentRequest), [
                'status' => 'scheduled',
                'scheduled_date' => '2026-11-11',
                'scheduled_time' => '12:30',
                'reason' => 'Doctor was unavailable at the requested time; patient agreed to the new slot.',
                'created_by' => 9999,
                'source' => 'walk_in',
            ])
            ->assertRedirect(route('admin.appointment_requests.edit', $appointmentRequest));

        $appointmentRequest->refresh();
        $this->assertSame('2026-11-09', $appointmentRequest->preferred_date->toDateString());
        $this->assertSame('2026-11-11', $appointmentRequest->scheduled_date->toDateString());
        $this->assertSame('website', $appointmentRequest->source);
        $this->assertNull($appointmentRequest->created_by);
        $rescheduledEvent = AppointmentRequestEvent::query()
            ->where('appointment_request_id', $appointmentRequest->id)
            ->where('event_type', 'rescheduled')
            ->firstOrFail();
        $this->assertSame('2026-11-10', $rescheduledEvent->previous_scheduled_date->toDateString());
        $this->assertSame('11:00', substr((string) $rescheduledEvent->previous_scheduled_time, 0, 5));
        $this->assertSame('2026-11-11', $rescheduledEvent->new_scheduled_date->toDateString());
        $this->assertSame('12:30', substr((string) $rescheduledEvent->new_scheduled_time, 0, 5));
        $this->assertSame($receptionist->id, $rescheduledEvent->performed_by);
        $this->assertSame('Doctor was unavailable at the requested time; patient agreed to the new slot.', $rescheduledEvent->reason);
        $this->assertDatabaseCount('appointment_request_events', 2);
    }

    public function test_scheduled_status_requires_a_confirmed_date_and_time(): void
    {
        $this->travelTo('2026-11-08 09:00:00');
        $receptionist = $this->userWithRole('Receptionist');
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Patient',
            'phone' => '01700000000',
            'status' => 'pending',
        ]);

        $this->actingAs($receptionist)
            ->put(route('admin.appointment_requests.update', $appointmentRequest), ['status' => 'scheduled'])
            ->assertSessionHasErrors(['scheduled_date', 'scheduled_time']);

        $this->assertSame('pending', $appointmentRequest->fresh()->status);
        $this->assertDatabaseCount('appointment_request_events', 0);
    }

    public function test_receptionist_cannot_schedule_a_past_slot(): void
    {
        $this->travelTo('2026-11-08 09:00:00');
        $receptionist = $this->userWithRole('Receptionist');
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Patient',
            'phone' => '01700000000',
            'status' => 'pending',
        ]);

        $this->actingAs($receptionist)
            ->put(route('admin.appointment_requests.update', $appointmentRequest), [
                'status' => 'scheduled',
                'scheduled_date' => '2026-11-07',
                'scheduled_time' => '09:00',
            ])
            ->assertSessionHasErrors('scheduled_date');

        $this->assertSame('pending', $appointmentRequest->fresh()->status);
    }

    public function test_receptionist_cannot_create_requests_without_create_permission(): void
    {
        $role = Role::create(['name' => 'Appointment Viewer', 'guard_name' => 'web']);
        $role->givePermissionTo('appointments.view');
        $user = $this->userWithRole('Appointment Viewer');

        $this->actingAs($user)
            ->post(route('admin.appointment_requests.store'), [
                'name' => 'Synthetic Caller',
                'phone' => '01700000000',
                'source' => 'phone',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('appointment_requests', 0);
    }

    public function test_super_admin_can_create_requests_without_explicit_appointment_permission(): void
    {
        $superAdmin = $this->userWithRole('Super Admin');

        $this->actingAs($superAdmin)
            ->post(route('admin.appointment_requests.store'), [
                'name' => 'Synthetic Walk-in',
                'phone' => '01700000000',
                'source' => 'walk_in',
            ])
            ->assertRedirect(route('admin.appointment_requests.index'));

        $this->assertDatabaseHas('appointment_requests', [
            'name' => 'Synthetic Walk-in',
            'source' => 'walk_in',
            'created_by' => $superAdmin->id,
            'status' => 'pending',
        ]);
    }

    public function test_public_submission_is_marked_as_website_and_has_no_staff_creator(): void
    {
        $this->travelTo('2026-11-08 09:00:00');

        $this->from(route('appointment.request.form'))->post('/appointment-requests', [
            'name' => 'Synthetic Website Visitor',
            'phone' => '01700000000',
            'preferred_date' => '2026-11-10',
            'preferred_time' => '10:00',
            'source' => 'phone',
        ])->assertRedirect(route('appointment.request.form'));

        $appointmentRequest = AppointmentRequest::query()->where('name', 'Synthetic Website Visitor')->firstOrFail();
        $this->assertSame('website', $appointmentRequest->source);
        $this->assertNull($appointmentRequest->created_by);
        $this->assertDatabaseHas('appointment_request_events', [
            'appointment_request_id' => $appointmentRequest->id,
            'event_type' => 'submitted',
            'performed_by' => null,
            'new_status' => 'pending',
        ]);
    }

    public function test_accountant_cannot_view_or_change_appointment_requests(): void
    {
        $accountant = $this->userWithRole('Accountant');
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Patient',
            'phone' => '01700000000',
            'status' => 'pending',
        ]);

        $this->actingAs($accountant)
            ->get(route('admin.appointment_requests.index'))
            ->assertForbidden();

        $this->actingAs($accountant)
            ->put(route('admin.appointment_requests.update', $appointmentRequest), ['status' => 'contacted'])
            ->assertForbidden();

        $this->actingAs($accountant)
            ->delete(route('admin.appointment_requests.destroy', $appointmentRequest))
            ->assertForbidden();

        $this->assertSame('pending', $appointmentRequest->fresh()->status);
        $this->assertDatabaseHas('appointment_requests', [
            'id' => $appointmentRequest->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseCount('appointment_request_events', 0);
    }

    public function test_receptionist_can_archive_request_from_active_list_and_preserve_audit_history(): void
    {
        $receptionist = $this->userWithRole('Receptionist');
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Caller',
            'phone' => '01700000000',
            'preferred_date' => '2026-11-09',
            'preferred_time' => '09:30:00',
            'scheduled_date' => '2026-11-10',
            'scheduled_time' => '10:00:00',
            'source' => 'phone',
            'created_by' => $receptionist->id,
            'status' => 'scheduled',
        ]);
        $appointmentRequest->events()->create([
            'performed_by' => $receptionist->id,
            'performed_by_name' => $receptionist->name,
            'event_type' => 'scheduled',
            'previous_status' => 'pending',
            'new_status' => 'scheduled',
            'new_scheduled_date' => '2026-11-10',
            'new_scheduled_time' => '10:00:00',
        ]);

        $this->actingAs($receptionist)
            ->delete(route('admin.appointment_requests.destroy', $appointmentRequest))
            ->assertRedirect(route('admin.appointment_requests.index'))
            ->assertSessionHas('success', 'Appointment request removed from the active list. Its audit history was preserved.');

        $this->assertDatabaseHas('appointment_requests', [
            'id' => $appointmentRequest->id,
            'status' => 'scheduled',
        ]);
        $this->assertDatabaseCount('appointment_request_events', 2);
        $this->assertDatabaseHas('appointment_request_events', [
            'appointment_request_id' => $appointmentRequest->id,
            'performed_by' => $receptionist->id,
            'performed_by_name' => $receptionist->name,
            'event_type' => 'archived',
            'previous_status' => 'scheduled',
            'new_status' => 'scheduled',
        ]);
        $archivedEvent = AppointmentRequestEvent::query()
            ->where('appointment_request_id', $appointmentRequest->id)
            ->where('event_type', 'archived')
            ->firstOrFail();
        $this->assertSame('2026-11-10', $archivedEvent->previous_scheduled_date->toDateString());
        $this->assertSame('2026-11-10', $archivedEvent->new_scheduled_date->toDateString());

        $this->actingAs($receptionist)
            ->get(route('admin.appointment_requests.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AppointmentRequests/Index')
                ->has('requests.data', 0));
    }

    public function test_super_admin_can_remove_appointment_request_without_delete_permission(): void
    {
        $superAdmin = $this->userWithRole('Super Admin');
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Walk-in',
            'phone' => '01700000000',
            'status' => 'pending',
        ]);

        $this->actingAs($superAdmin)
            ->delete(route('admin.appointment_requests.destroy', $appointmentRequest))
            ->assertRedirect(route('admin.appointment_requests.index'));

        $this->assertDatabaseHas('appointment_requests', [
            'id' => $appointmentRequest->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('appointment_request_events', [
            'appointment_request_id' => $appointmentRequest->id,
            'performed_by' => $superAdmin->id,
            'event_type' => 'archived',
        ]);
    }

    public function test_manage_page_displays_original_slot_and_change_history(): void
    {
        $receptionist = $this->userWithRole('Receptionist');
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Patient',
            'phone' => '01700000000',
            'preferred_date' => '2026-11-09',
            'preferred_time' => '09:30:00',
            'scheduled_date' => '2026-11-10',
            'scheduled_time' => '10:00:00',
            'source' => 'phone',
            'created_by' => $receptionist->id,
            'status' => 'scheduled',
        ]);
        AppointmentRequestEvent::query()->create([
            'appointment_request_id' => $appointmentRequest->id,
            'performed_by' => $receptionist->id,
            'performed_by_name' => $receptionist->name,
            'event_type' => 'scheduled',
            'previous_status' => 'pending',
            'new_status' => 'scheduled',
            'new_scheduled_date' => '2026-11-10',
            'new_scheduled_time' => '10:00:00',
        ]);

        $this->actingAs($receptionist)
            ->get(route('admin.appointment_requests.edit', $appointmentRequest))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AppointmentRequests/Edit')
                ->where('appointmentRequest.preferred_date', '2026-11-09')
                ->where('appointmentRequest.scheduled_date', '2026-11-10')
                ->where('appointmentRequest.creator_name', $receptionist->name)
                ->has('appointmentRequest.events', 1));
    }

    public function test_patient_created_from_request_is_linked_and_cannot_be_converted_twice(): void
    {
        $this->createClinicSetting();
        $receptionist = $this->userWithRole('Receptionist');
        $this->grantPermissions($receptionist, ['patients.create', 'patients.view']);
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Caller',
            'phone' => '01700000000',
            'source' => 'phone',
            'status' => 'pending',
        ]);
        $profile = PatientNumberingProfile::query()->where('is_active', true)->where('is_default', true)->firstOrFail();

        $this->actingAs($receptionist)
            ->post(route('admin.appointment_requests.convert', $appointmentRequest))
            ->assertRedirect(route('admin.patients.create', ['appointment_request_id' => $appointmentRequest->id]));

        $this->actingAs($receptionist)
            ->get(route('admin.patients.create', ['appointment_request_id' => $appointmentRequest->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Patients/Create')
                ->where('appointmentRequestId', $appointmentRequest->id)
                ->where('defaults.name', 'Synthetic Caller')
                ->where('defaults.phone', '01700000000'));

        $this->actingAs($receptionist)
            ->post(route('admin.patients.store'), [
                'appointment_request_id' => $appointmentRequest->id,
                'patient_numbering_profile_id' => $profile->id,
                'name' => 'Synthetic Caller',
                'phone' => '01700000000',
                'gender' => 'female',
            ])
            ->assertRedirect(route('admin.appointment_requests.index'));

        $patient = Patient::query()->where('name', 'Synthetic Caller')->firstOrFail();
        $this->assertDatabaseCount('patients', 1);
        $this->assertDatabaseHas('appointment_requests', [
            'id' => $appointmentRequest->id,
            'converted_patient_id' => $patient->id,
        ]);
        $this->assertDatabaseHas('appointment_request_events', [
            'appointment_request_id' => $appointmentRequest->id,
            'performed_by' => $receptionist->id,
            'event_type' => 'converted',
        ]);

        $this->actingAs($receptionist)
            ->post(route('admin.appointment_requests.convert', $appointmentRequest))
            ->assertRedirect(route('admin.appointment_requests.index'))
            ->assertSessionHas('warning');

        $this->assertDatabaseCount('patients', 1);
        $this->actingAs($receptionist)
            ->get(route('admin.appointment_requests.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AppointmentRequests/Index')
                ->where('requests.data.0.converted_patient_id', $patient->id)
                ->where('requests.data.0.existing_patient_match_id', null));
    }

    public function test_unique_existing_patient_match_can_be_linked_without_creating_a_duplicate(): void
    {
        $receptionist = $this->userWithRole('Receptionist');
        $this->grantPermissions($receptionist, ['patients.view']);
        $patient = Patient::factory()->create([
            'name' => ' synthetic existing patient ',
            'phone' => ' 01700000000 ',
        ]);
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Existing Patient',
            'phone' => '01700000000',
            'source' => 'website',
            'status' => 'pending',
        ]);

        $this->actingAs($receptionist)
            ->get(route('admin.appointment_requests.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AppointmentRequests/Index')
                ->where('requests.data.0.existing_patient_match_id', $patient->id));

        $this->actingAs($receptionist)
            ->post(route('admin.appointment_requests.link_patient', $appointmentRequest), ['patient_id' => $patient->id])
            ->assertRedirect(route('admin.appointment_requests.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseCount('patients', 1);
        $this->assertDatabaseHas('appointment_requests', [
            'id' => $appointmentRequest->id,
            'converted_patient_id' => $patient->id,
        ]);
        $this->assertDatabaseHas('appointment_request_events', [
            'appointment_request_id' => $appointmentRequest->id,
            'performed_by' => $receptionist->id,
            'event_type' => 'patient_linked',
        ]);
    }

    public function test_ambiguous_patient_matches_block_conversion(): void
    {
        $receptionist = $this->userWithRole('Receptionist');
        $this->grantPermissions($receptionist, ['patients.view', 'patients.create']);
        Patient::factory()->count(2)->create([
            'name' => 'Synthetic Shared Contact',
            'phone' => '01700000000',
        ]);
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Shared Contact',
            'phone' => '01700000000',
            'status' => 'pending',
        ]);

        $this->actingAs($receptionist)
            ->get(route('admin.appointment_requests.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AppointmentRequests/Index')
                ->where('requests.data.0.existing_patient_match_id', null)
                ->where('requests.data.0.has_ambiguous_patient_match', true));

        $this->actingAs($receptionist)
            ->post(route('admin.appointment_requests.convert', $appointmentRequest))
            ->assertRedirect(route('admin.appointment_requests.index'))
            ->assertSessionHas('warning');

        $this->assertDatabaseCount('patients', 2);
        $this->assertDatabaseHas('appointment_requests', [
            'id' => $appointmentRequest->id,
            'converted_patient_id' => null,
        ]);
    }

    public function test_linking_existing_patient_requires_patient_view_permission(): void
    {
        $receptionist = $this->userWithRole('Receptionist');
        $patient = Patient::factory()->create([
            'name' => 'Synthetic Restricted Match',
            'phone' => '01700000000',
        ]);
        $appointmentRequest = AppointmentRequest::query()->create([
            'name' => 'Synthetic Restricted Match',
            'phone' => '01700000000',
            'status' => 'pending',
        ]);

        $this->actingAs($receptionist)
            ->post(route('admin.appointment_requests.link_patient', $appointmentRequest), ['patient_id' => $patient->id])
            ->assertForbidden();

        $this->assertDatabaseHas('appointment_requests', [
            'id' => $appointmentRequest->id,
            'converted_patient_id' => null,
        ]);
    }

    private function grantPermissions(User $user, array $permissionNames): void
    {
        $permissions = collect($permissionNames)->map(fn (string $permissionName) => Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web'])
        );

        $user->givePermissionTo($permissions);
    }

    private function createClinicSetting(): void
    {
        ClinicSetting::create([
            'clinic_name_en' => 'Synthetic Clinic',
            'doctor_name' => 'Dr. Synthetic',
            'doctor_credentials' => 'DHMS',
            'address' => 'Synthetic address',
            'phone' => '01700000000',
        ]);
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
            'password' => Hash::make('Password1!'),
        ]);
        $user->assignRole($roleName);

        return $user;
    }
}
