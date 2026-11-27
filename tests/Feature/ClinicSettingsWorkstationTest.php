<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClinicSettingsWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create required permissions
        Permission::firstOrCreate(['name' => 'clinic_settings.view']);
        Permission::firstOrCreate(['name' => 'clinic_settings.update']);
        Permission::firstOrCreate(['name' => 'prescription_options.view']);

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctor = Role::firstOrCreate(['name' => 'Doctor']);
        $receptionist = Role::firstOrCreate(['name' => 'Receptionist']);

        $superAdmin->givePermissionTo(Permission::all());

        // Create standard clinic settings
        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health Center',
            'clinic_name_bn' => 'রেমেডিক হেলথ সেন্টার',
            'doctor_name' => 'Dr. Fazlul Karim',
            'doctor_credentials' => 'DHMS, BHMS',
            'phone' => '01700000000',
            'bkash_number' => '01711223344',
            'address' => 'Chamber Road, Bogura',
            'practice_type' => 'homeopathy',
            'auto_deduct_inventory' => true,
            'default_consultation_fee' => 500.00,
            'patient_no_series' => 'A',
            'patient_no_next' => 1,
            'visiting_hours_schedule' => [
                'mode' => 'selected_hours',
                'days' => [
                    'Sunday' => [['from' => '09:00', 'to' => '13:00']],
                    'Monday' => [['from' => '09:00', 'to' => '13:00']],
                    'Tuesday' => [['from' => '09:00', 'to' => '13:00']],
                    'Wednesday' => [['from' => '09:00', 'to' => '13:00']],
                    'Thursday' => [['from' => '09:00', 'to' => '13:00']],
                    'Friday' => [],
                    'Saturday' => [['from' => '09:00', 'to' => '13:00']],
                ],
            ],
        ]);
    }

    private function createSuperAdmin(): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
        ]);
        $user->assignRole('Super Admin');

        return $user;
    }

    private function createDoctor(): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
        ]);
        $user->assignRole('Doctor');

        return $user;
    }

    public function test_super_admin_can_view_clinic_settings_workstation_with_kpis(): void
    {
        $admin = $this->createSuperAdmin();

        $response = $this->actingAs($admin)->get(route('admin.settings.edit'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Settings/Edit')
            ->has('settings')
            ->where('settings.clinic_name_en', 'RemediQ Health Center')
            ->where('settings.bkash_number', '01711223344')
            ->has('kpis')
            ->where('kpis.practice_type', 'homeopathy')
            ->where('kpis.auto_deduct_inventory', true)
            ->where('kpis.default_consultation_fee', 500)
            ->where('kpis.schedule_mode', 'selected_hours')
            ->where('kpis.active_days_count', 6)
            ->has('logoUrl')
            ->has('faviconUrl')
        );
    }

    public function test_non_super_admin_roles_are_strictly_forbidden_from_accessing_settings(): void
    {
        $doctor = $this->createDoctor();

        // Doctor cannot view settings
        $this->actingAs($doctor)
            ->get(route('admin.settings.edit'))
            ->assertForbidden();

        // Doctor cannot update settings
        $this->actingAs($doctor)
            ->put(route('admin.settings.update'), [
                'clinic_name_en' => 'Hacked Clinic',
                'phone' => '01700000000',
                'address' => 'Dhaka',
            ])
            ->assertForbidden();
    }

    public function test_super_admin_can_update_clinic_settings_including_bkash_and_practice_type(): void
    {
        $admin = $this->createSuperAdmin();

        $payload = [
            'clinic_name_en' => 'RemediQ Modern Polyclinic',
            'clinic_name_bn' => 'রেমেডিক আধুনিক পলিক্লিনিক',
            'phone' => '01899887766',
            'bkash_number' => '01988776655',
            'address' => 'Medical College Road, Bogura',
            'visiting_hours' => '9:00 AM - 9:00 PM',
            'practice_type' => 'integrative_dual',
            'auto_deduct_inventory' => true,
            'default_consultation_fee' => 800.00,
            'invoice_footer_note' => 'Thank you for choosing RemediQ Polyclinic.',
        ];

        $response = $this->actingAs($admin)->put(route('admin.settings.update'), $payload);

        $response->assertRedirect(route('admin.settings.edit'));
        $response->assertSessionHas('success', 'Settings updated.');

        $this->assertDatabaseHas('clinic_settings', [
            'clinic_name_en' => 'RemediQ Modern Polyclinic',
            'clinic_name_bn' => 'রেমেডিক আধুনিক পলিক্লিনিক',
            'phone' => '01899887766',
            'bkash_number' => '01988776655',
            'practice_type' => 'integrative_dual',
            'default_consultation_fee' => 800.00,
            'invoice_footer_note' => 'Thank you for choosing RemediQ Polyclinic.',
        ]);
    }

    public function test_super_admin_can_upload_and_remove_clinic_logo_and_favicon(): void
    {
        Storage::fake('public');
        $admin = $this->createSuperAdmin();

        $logo = UploadedFile::fake()->image('test_logo.png', 200, 200);
        $favicon = UploadedFile::fake()->create('test_favicon.ico', 50, 'image/x-icon');

        // Upload logo & favicon
        $response = $this->actingAs($admin)->post(route('admin.settings.update'), [
            '_method' => 'put',
            'clinic_name_en' => 'RemediQ Clinic',
            'phone' => '01700000000',
            'address' => 'Dhaka',
            'logo' => $logo,
            'favicon' => $favicon,
        ]);

        $response->assertRedirect(route('admin.settings.edit'));

        $setting = ClinicSetting::first();
        $this->assertNotNull($setting->logo_path);
        $this->assertNotNull($setting->favicon_path);
        Storage::disk('public')->assertExists($setting->logo_path);
        Storage::disk('public')->assertExists($setting->favicon_path);

        // Remove logo & favicon
        $response = $this->actingAs($admin)->put(route('admin.settings.update'), [
            'clinic_name_en' => 'RemediQ Clinic',
            'phone' => '01700000000',
            'address' => 'Dhaka',
            'remove_logo' => true,
            'remove_favicon' => true,
        ]);

        $response->assertRedirect(route('admin.settings.edit'));

        $setting->refresh();
        $this->assertNull($setting->logo_path);
        $this->assertNull($setting->favicon_path);
    }

    public function test_super_admin_can_update_visiting_hours_schedule(): void
    {
        $admin = $this->createSuperAdmin();

        $schedule = [
            'mode' => 'always_open',
            'days' => [
                'Saturday' => [['from' => '00:00', 'to' => '23:59']],
            ],
        ];

        $response = $this->actingAs($admin)->put(route('admin.settings.update'), [
            'clinic_name_en' => '24/7 RemediQ Hospital',
            'phone' => '01700000000',
            'address' => 'Bogura',
            'visiting_hours_schedule' => $schedule,
        ]);

        $response->assertRedirect(route('admin.settings.edit'));

        $setting = ClinicSetting::first();
        $this->assertEquals('always_open', $setting->visiting_hours_schedule['mode']);
    }
}
