<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClinicBrandingAndLanguageTitleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $modules = ['patients', 'visits', 'settings'];
        $actions = ['view', 'create', 'update'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}", 'guard_name' => 'web']);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->givePermissionTo(Permission::all());

        ClinicSetting::create([
            'clinic_name_en' => 'Green Life Homeopathy',
            'clinic_name_bn' => 'গ্রিন লাইফ হোমিওপ্যাথি',
            'phone' => '01711000000',
            'address' => 'Dhaka, Bangladesh',
            'doctor_name' => 'Dr. Fazlul Karim',
            'doctor_credentials' => 'BHMS, MD',
            'practice_type' => 'homeopathy',
        ]);
    }

    private function createSuperAdmin(): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_inertia_shares_clinic_name_and_locale_in_english(): void
    {
        $user = $this->createSuperAdmin();

        $response = $this->actingAs($user)->get(route('admin.patients.create'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Patients/Create')
                ->where('locale', 'en')
                ->where('clinic.name_en', 'Green Life Homeopathy')
                ->where('clinic.name_bn', 'গ্রিন লাইফ হোমিওপ্যাথি')
                ->where('clinic.name', 'Green Life Homeopathy')
            );

        // Verify server-rendered <title inertia> in app.blade.php
        $response->assertSee('<title inertia>Green Life Homeopathy</title>', false);
        $response->assertDontSee('- Laravel');
    }

    public function test_inertia_shares_bangla_clinic_name_when_locale_is_bn(): void
    {
        $user = $this->createSuperAdmin();

        $response = $this->actingAs($user)
            ->withCookie('locale', 'bn')
            ->get(route('admin.patients.create'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Patients/Create')
                ->where('locale', 'bn')
                ->where('clinic.name_en', 'Green Life Homeopathy')
                ->where('clinic.name_bn', 'গ্রিন লাইফ হোমিওপ্যাথি')
                ->where('clinic.name', 'গ্রিন লাইফ হোমিওপ্যাথি')
            );

        // Verify server-rendered <title inertia> in app.blade.php has Bangla name
        $response->assertSee('<title inertia>গ্রিন লাইফ হোমিওপ্যাথি</title>', false);
        $response->assertDontSee('- Laravel');
    }

    public function test_updating_clinic_settings_updates_branding_names(): void
    {
        $user = $this->createSuperAdmin();
        $settings = ClinicSetting::first();

        $settings->update([
            'clinic_name_en' => 'Apex Integrative Clinic',
            'clinic_name_bn' => 'এপেক্স ইন্টিগ্রেটিভ ক্লিনিক',
        ]);

        $enResponse = $this->actingAs($user)->get(route('admin.patients.create'));
        $enResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('clinic.name', 'Apex Integrative Clinic')
                ->where('clinic.name_en', 'Apex Integrative Clinic')
            );
        $enResponse->assertSee('<title inertia>Apex Integrative Clinic</title>', false);

        $bnResponse = $this->actingAs($user)->withCookie('locale', 'bn')->get(route('admin.patients.create'));
        $bnResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('clinic.name', 'এপেক্স ইন্টিগ্রেটিভ ক্লিনিক')
                ->where('clinic.name_bn', 'এপেক্স ইন্টিগ্রেটিভ ক্লিনিক')
            );
        $bnResponse->assertSee('<title inertia>এপেক্স ইন্টিগ্রেটিভ ক্লিনিক</title>', false);
    }
}
