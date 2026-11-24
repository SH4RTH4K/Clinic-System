<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientNotification;
use App\Models\User;
use App\Models\Visit;
use App\Services\QueueService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AutomatedPatientCommunicationsTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $staff;

    private User $unauthorizedUser;

    private Patient $patient;

    private Doctor $doctor;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'communications.view',
            'communications.send',
            'communications.manage',
            'queue.view',
            'queue.manage',
            'appointments.view',
            'appointments.update',
            'visits.view',
            'visits.create',
            'visits.finalize',
            'patients.view',
            'clinic_settings.view',
            'clinic_settings.update',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        $staffRole = Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web']);
        $staffRole->givePermissionTo([
            'communications.view',
            'communications.send',
            'queue.view',
            'queue.manage',
            'appointments.view',
            'appointments.update',
            'visits.view',
            'patients.view',
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->superAdmin = User::factory()->create(['name' => 'Admin User']);
        $this->superAdmin->assignRole('Super Admin');

        $this->staff = User::factory()->create(['name' => 'Staff Member']);
        $this->staff->assignRole('Staff');

        $this->unauthorizedUser = User::factory()->create(['name' => 'Random User']);

        $doctorUser = User::factory()->create(['name' => 'Dr. Rahman']);
        $this->doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'name' => 'Dr. Rahman',
            'name_bn' => 'ডাঃ রহমান',
            'credentials' => 'BHMS, MD',
            'specialty' => 'Homeopathy',
            'chamber_no' => 'Room 101',
            'is_active' => true,
        ]);

        $this->patient = Patient::factory()->create([
            'name' => 'Kamal Hossain',
            'phone' => '01711002233',
        ]);

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Healthcare',
            'clinic_name_bn' => 'রেমেডিক হেলথকেয়ার',
            'doctor_name' => 'Dr. Rahman',
            'doctor_credentials' => 'BHMS, MD',
            'address' => 'Dhaka, Bangladesh',
            'phone' => '01888000000',
            'practice_type' => 'integrative_dual',
            'sms_config' => [
                'sms_enabled' => true,
                'sms_provider' => 'log',
                'api_url' => '',
                'api_key' => '',
                'sender_id' => 'RemediQ',
                'auto_sms_appointments' => true,
                'auto_sms_queue' => true,
                'auto_sms_prescriptions' => true,
                'templates' => [
                    'appointment_confirmed' => 'Dear {patient_name}, your appointment with {doctor_name} is confirmed for {date} at {time}.',
                    'queue_token_issued' => 'Token {token_code} issued for {patient_name} at {clinic_name}. Assigned to {doctor_name} ({service_room}).',
                    'prescription_ready' => 'Dear {patient_name}, your prescription is ready: {prescription_url}',
                ],
            ],
        ]);
    }

    public function test_authorized_user_can_view_communications_index_and_metrics(): void
    {
        PatientNotification::factory()->create([
            'patient_id' => $this->patient->id,
            'channel' => 'sms',
            'status' => 'sent',
            'recipient_phone' => '01711002233',
            'message_body' => 'Test SMS Message',
        ]);

        $response = $this->actingAs($this->staff)->get(route('admin.communications.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Communications/Index')
            ->has('notifications.data', 1)
            ->has('metrics')
            ->where('metrics.total_sent', 1)
            ->where('metrics.total_sms', 1)
        );
    }

    public function test_unauthorized_user_cannot_view_communications_center(): void
    {
        $response = $this->actingAs($this->unauthorizedUser)->get(route('admin.communications.index'));
        $response->assertForbidden();
    }

    public function test_can_send_custom_sms_and_record_notification_ledger(): void
    {
        $response = $this->actingAs($this->staff)->post(route('admin.communications.send_custom'), [
            'patient_id' => $this->patient->id,
            'phone' => '01711002233',
            'message' => 'Please arrive 10 minutes prior to your visit.',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertDatabaseHas('patient_notifications', [
            'patient_id' => $this->patient->id,
            'recipient_phone' => '01711002233',
            'channel' => 'sms',
            'event_type' => 'custom_alert',
            'message_body' => 'Please arrive 10 minutes prior to your visit.',
            'status' => 'sent',
            'sent_by' => $this->staff->id,
        ]);
    }

    public function test_sms_settings_can_be_viewed_and_updated_by_super_admin(): void
    {
        $response = $this->actingAs($this->superAdmin)->get(route('admin.communications.settings'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Communications/Settings')
            ->has('config')
            ->where('config.sms_enabled', true)
        );

        $updateResponse = $this->actingAs($this->superAdmin)->put(route('admin.communications.settings.update'), [
            'sms_enabled' => false,
            'sms_provider' => 'greenweb',
            'api_url' => 'https://api.greenweb.com.bd/api.php',
            'api_key' => 'secret_token_123',
            'sender_id' => 'REMEDIQ',
            'auto_sms_appointments' => true,
            'auto_sms_queue' => false,
            'auto_sms_prescriptions' => true,
            'templates' => [
                'appointment_confirmed' => 'Updated appointment confirmation for {patient_name}',
                'queue_token_issued' => 'Updated token notification for {token_code}',
                'prescription_ready' => 'Updated rx link: {prescription_url}',
            ],
        ]);

        $updateResponse->assertSessionHasNoErrors();
        $updateResponse->assertRedirect();

        $settings = ClinicSetting::first();
        $this->assertFalse($settings->sms_config['sms_enabled']);
        $this->assertEquals('greenweb', $settings->sms_config['sms_provider']);
        $this->assertEquals('secret_token_123', $settings->sms_config['api_key']);
        $this->assertEquals('Updated appointment confirmation for {patient_name}', $settings->sms_config['templates']['appointment_confirmed']);
    }

    public function test_automated_sms_dispatched_on_queue_token_issued(): void
    {
        $queueService = app(QueueService::class);

        $token = $queueService->issueToken([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'token_date' => Carbon::today()->toDateString(),
            'priority' => 'normal',
        ], $this->staff);

        $this->assertNotNull($token);
        $this->assertEquals('waiting', $token->status);

        // Check that a notification record was created in the ledger
        $this->assertDatabaseHas('patient_notifications', [
            'patient_id' => $this->patient->id,
            'channel' => 'sms',
            'event_type' => 'queue_token',
            'status' => 'sent',
        ]);

        $notification = PatientNotification::where('event_type', 'queue_token')->first();
        $this->assertStringContainsString($token->token_code, $notification->message_body);
        $this->assertStringContainsString('Kamal Hossain', $notification->message_body);
    }

    public function test_automated_sms_dispatched_on_appointment_scheduled(): void
    {
        $appointment = AppointmentRequest::create([
            'name' => 'Shakil Ahmed',
            'phone' => '01811223344',
            'source' => 'online',
            'status' => 'pending',
            'created_by' => $this->staff->id,
        ]);

        $response = $this->actingAs($this->staff)->put(route('admin.appointment_requests.update', $appointment->id), [
            'status' => 'scheduled',
            'scheduled_date' => Carbon::tomorrow()->toDateString(),
            'scheduled_time' => '10:30',
            'reason' => 'Scheduled by doctor request',
        ]);

        $response->assertSessionHasNoErrors();

        // Check that appointment notification was recorded
        $this->assertDatabaseHas('patient_notifications', [
            'recipient_phone' => '01811223344',
            'channel' => 'sms',
            'event_type' => 'appointment_confirmation',
            'status' => 'sent',
        ]);

        $notification = PatientNotification::where('event_type', 'appointment_confirmation')->first();
        $this->assertStringContainsString('Shakil Ahmed', $notification->message_body);
    }

    public function test_whatsapp_share_url_generation_and_logging(): void
    {
        $visit = Visit::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => Carbon::today(),
            'chief_complaint' => 'Cold and fever',
            'status' => 'finalized',
            'prescription_status' => 'finalized',
            'finalized_by' => $this->superAdmin->id,
            'share_token' => 'sample_token_abc_123',
        ]);

        $response = $this->actingAs($this->staff)->getJson(route('admin.visits.whatsapp_url', $visit->id));
        $response->assertOk();
        $response->assertJsonStructure(['url', 'share_url', 'phone']);

        $url = $response->json('url');
        $this->assertStringContainsString('api.whatsapp.com/send', $url);
        $this->assertStringContainsString('8801711002233', $url);
        $this->assertStringContainsString('sample_token_abc_123', $url);

        // Verification of WhatsApp notification log
        $this->assertDatabaseHas('patient_notifications', [
            'patient_id' => $this->patient->id,
            'channel' => 'whatsapp',
            'event_type' => 'prescription_ready',
            'gateway_provider' => 'whatsapp_click_to_chat',
            'status' => 'sent',
        ]);
    }

    public function test_public_digital_prescription_view_and_pdf_download(): void
    {
        $visit = Visit::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => Carbon::today(),
            'chief_complaint' => 'Persistent cough',
            'status' => 'finalized',
            'prescription_status' => 'finalized',
            'finalized_by' => $this->superAdmin->id,
            'share_token' => 'public_share_token_xyz_999',
            'prescriber_snapshot' => [
                'doctor_name' => 'Dr. Rahman',
                'credentials' => 'BHMS, MD',
            ],
            'patient_snapshot' => [
                'name' => 'Kamal Hossain',
                'gender' => 'male',
            ],
        ]);

        // Unauthenticated public patient viewing digital prescription
        $publicView = $this->get(route('rx.show', 'public_share_token_xyz_999'));
        $publicView->assertOk();
        $publicView->assertInertia(fn ($page) => $page
            ->component('Public/DigitalPrescription')
            ->has('visit')
            ->where('visit.id', $visit->id)
            ->where('token', 'public_share_token_xyz_999')
            ->has('clinic')
        );

        // Unauthenticated public patient downloading prescription PDF
        $pdfResponse = $this->get(route('rx.pdf', 'public_share_token_xyz_999'));
        $pdfResponse->assertOk();
        $pdfResponse->assertHeader('content-type', 'application/pdf');
    }

    public function test_unfinalized_visit_digital_prescription_returns_404(): void
    {
        $draftVisit = Visit::create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_date' => Carbon::today(),
            'chief_complaint' => 'General checkup',
            'status' => 'draft',
            'prescription_status' => 'draft',
            'share_token' => 'draft_token_not_ready_404',
        ]);

        $response = $this->get(route('rx.show', 'draft_token_not_ready_404'));
        $response->assertNotFound();

        $pdfResponse = $this->get(route('rx.pdf', 'draft_token_not_ready_404'));
        $pdfResponse->assertNotFound();
    }
}
