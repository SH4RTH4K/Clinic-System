<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use App\Services\CommunicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CommunicationGatewayTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $unauthorizedUser;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'communications.view',
            'communications.send',
            'communications.manage',
            'clinic_settings.view',
            'clinic_settings.update',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $receptionistRole->givePermissionTo(['communications.view']);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->superAdmin = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->superAdmin->assignRole('Super Admin');

        $this->unauthorizedUser = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->unauthorizedUser->assignRole('Receptionist');

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Healthcare',
            'clinic_name_bn' => 'রেমেডিক হেলথকেয়ার',
            'doctor_name' => 'Dr. Rahman',
            'doctor_credentials' => 'BHMS, MD',
            'address' => 'Dhaka, Bangladesh',
            'phone' => '01888000000',
        ]);
    }

    public function test_unauthorized_user_cannot_access_gateway_settings_or_balance(): void
    {
        $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.communications.settings'))
            ->assertForbidden();

        $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.communications.gateway_balance'))
            ->assertForbidden();

        $this->actingAs($this->unauthorizedUser)
            ->postJson(route('admin.communications.test_sms'), [
                'phone' => '01711223344',
                'message' => 'Test message',
            ])
            ->assertForbidden();
    }

    public function test_authorized_admin_can_view_communication_settings_with_5_kpi_cards_and_balance(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('admin.communications.settings'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Communications/Settings')
            ->has('config')
            ->has('metrics', fn (Assert $m) => $m
                ->has('total_dispatches')
                ->has('total_sms')
                ->has('total_whatsapp')
                ->has('total_sent')
                ->has('total_failed')
                ->has('delivery_rate')
                ->has('today_dispatched'))
            ->has('initialBalance', fn (Assert $b) => $b
                ->where('status', 'success')
                ->has('provider')
                ->has('balance')
                ->has('unit')
                ->has('is_active'))
        );
    }

    public function test_authorized_admin_can_fetch_gateway_balance_endpoint(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->getJson(route('admin.communications.gateway_balance'));

        $response->assertOk();
        $response->assertJson([
            'status' => 'success',
            'balance' => 'Unlimited',
        ]);
    }

    public function test_authorized_admin_can_dispatch_test_sms(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->postJson(route('admin.communications.test_sms'), [
                'phone' => '01711223344',
                'message' => 'Live gateway test message from RemediQ studio',
            ]);

        $response->assertOk();
        $response->assertJson([
            'status' => 'sent',
            'gateway_provider' => 'log',
        ]);
        $response->assertJsonStructure(['status', 'gateway_provider', 'gateway_response', 'message']);
    }

    public function test_authorized_admin_can_update_gateway_and_templates_including_whatsapp(): void
    {
        $payload = [
            'sms_enabled' => true,
            'sms_provider' => 'greenweb',
            'api_url' => 'https://api.greenweb.com.bd/api.php',
            'api_key' => 'secret_test_token_123',
            'sender_id' => 'REMEDIQ',
            'auto_sms_appointments' => true,
            'auto_sms_queue' => true,
            'auto_sms_prescriptions' => true,
            'templates' => [
                'appointment_confirmed' => 'Salam {patient_name}, appointment with {doctor_name} confirmed at {time}.',
                'queue_token_issued' => 'Token {token_code} for {patient_name}. Chamber: {service_room}.',
                'prescription_ready' => 'Rx ready for {patient_name}. Download: {prescription_url}',
                'whatsapp_prescription' => 'Hello {patient_name}, here is your Rx: {prescription_url}',
            ],
        ];

        $response = $this->actingAs($this->superAdmin)
            ->put(route('admin.communications.settings.update'), $payload);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $settings = ClinicSetting::firstOrFail();
        $config = $settings->getSmsConfig();

        $this->assertTrue($config['sms_enabled']);
        $this->assertSame('greenweb', $config['sms_provider']);
        $this->assertSame('secret_test_token_123', $config['api_key']);
        $this->assertSame('REMEDIQ', $config['sender_id']);
        $this->assertSame('Salam {patient_name}, appointment with {doctor_name} confirmed at {time}.', $config['templates']['appointment_confirmed']);
        $this->assertSame('Hello {patient_name}, here is your Rx: {prescription_url}', $config['templates']['whatsapp_prescription']);
    }

    public function test_whatsapp_share_url_generation_uses_custom_template(): void
    {
        $setting = ClinicSetting::first();
        $setting->update([
            'clinic_name_en' => 'RemediQ Health',
            'phone' => '01700000000',
            'sms_config' => array_merge(ClinicSetting::defaultSmsConfig(), [
                'templates' => [
                    'whatsapp_prescription' => 'Hello {patient_name}, your Rx from {clinic_name} by {doctor_name} is ready: {prescription_url}',
                ],
            ]),
        ]);

        $doctor = Doctor::factory()->create(['name' => 'Fazlul Karim']);
        $patient = Patient::factory()->create(['name' => 'Kamal Hossain', 'phone' => '01811223344']);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'visit_date' => now()->toDateString(),
        ]);

        $commService = app(CommunicationService::class);
        $url = $commService->generateWhatsAppShareUrl($visit);

        $this->assertStringContainsString('https://api.whatsapp.com/send?phone=8801811223344', $url);
        $this->assertStringContainsString('Hello+Kamal+Hossain', $url);
        $this->assertStringContainsString('Fazlul+Karim', $url);
    }
}
