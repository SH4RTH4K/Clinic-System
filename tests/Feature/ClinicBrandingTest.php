<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClinicBrandingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        foreach ([
            'clinic_settings.view',
            'clinic_settings.update',
            'doctors.view',
            'doctors.create',
            'doctors.update',
            'clinical_records.view',
            'patients.view',
            'visits.view',
            'visits.export',
        ] as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $role->syncPermissions(Permission::all());
    }

    public function test_super_admin_can_upload_clinic_logo_and_favicon(): void
    {
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('Super Admin');

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'phone' => '+8801700000000',
            'address' => 'Dhaka, Bangladesh',
            'doctor_name' => 'Dr. Homeopath',
            'doctor_credentials' => 'BHMS',
        ]);

        $logoFile = UploadedFile::fake()->image('remediq_logo.png', 300, 100);
        $faviconFile = UploadedFile::fake()->create('favicon.ico', 32, 'image/x-icon');

        $response = $this->actingAs($admin)
            ->post(route('admin.settings.update'), [
                '_method' => 'put',
                'clinic_name_en' => 'RemediQ Health Center',
                'phone' => '+8801700000000',
                'address' => 'Dhaka, Bangladesh',
                'logo' => $logoFile,
                'favicon' => $faviconFile,
            ]);

        $response->assertRedirect(route('admin.settings.edit'));
        $response->assertSessionHas('success');

        $settings = ClinicSetting::first();
        $this->assertNotNull($settings->logo_path);
        $this->assertNotNull($settings->favicon_path);

        Storage::disk('public')->assertExists($settings->logo_path);
        Storage::disk('public')->assertExists($settings->favicon_path);
    }

    public function test_public_routes_stream_clinic_logo_and_favicon(): void
    {
        $logoFile = UploadedFile::fake()->image('remediq_logo.png', 200, 80);
        $logoPath = $logoFile->store('branding', 'public');

        $faviconFile = UploadedFile::fake()->create('remediq_favicon.png', 32, 'image/png');
        $faviconPath = $faviconFile->store('branding', 'public');

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Clinic',
            'phone' => '+8801700000000',
            'address' => 'Dhaka',
            'doctor_name' => 'Dr. Hahnemann',
            'doctor_credentials' => 'MD',
            'logo_path' => $logoPath,
            'favicon_path' => $faviconPath,
        ]);

        $logoResponse = $this->get(route('clinic.logo'));
        $logoResponse->assertOk();
        $logoResponse->assertHeader('X-Content-Type-Options', 'nosniff');

        $faviconResponse = $this->get(route('clinic.favicon'));
        $faviconResponse->assertOk();
    }

    public function test_super_admin_can_remove_uploaded_logo_and_favicon(): void
    {
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('Super Admin');

        $logoFile = UploadedFile::fake()->image('logo.png', 100, 100);
        $logoPath = $logoFile->store('branding', 'public');

        $faviconFile = UploadedFile::fake()->create('favicon.ico', 16, 'image/x-icon');
        $faviconPath = $faviconFile->store('branding', 'public');

        $settings = ClinicSetting::create([
            'clinic_name_en' => 'RemediQ',
            'phone' => '123456',
            'address' => 'Test',
            'doctor_name' => 'Dr',
            'doctor_credentials' => 'MBBS',
            'logo_path' => $logoPath,
            'favicon_path' => $faviconPath,
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.settings.update'), [
                '_method' => 'put',
                'clinic_name_en' => 'RemediQ',
                'phone' => '123456',
                'address' => 'Test',
                'remove_logo' => true,
                'remove_favicon' => true,
            ]);

        $response->assertRedirect(route('admin.settings.edit'));

        $settings->refresh();
        $this->assertNull($settings->logo_path);
        $this->assertNull($settings->favicon_path);

        Storage::disk('public')->assertMissing($logoPath);
        Storage::disk('public')->assertMissing($faviconPath);
    }

    public function test_doctor_signature_and_seal_upload_and_streaming(): void
    {
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('Super Admin');

        $doctor = Doctor::create([
            'name' => 'Dr. Samuel Hahnemann',
            'qualification' => 'MD',
            'specialty' => 'Homeopathy',
            'is_active' => true,
        ]);

        $signatureFile = UploadedFile::fake()->image('doctor_signature.png', 200, 80);
        $sealFile = UploadedFile::fake()->image('doctor_seal.png', 100, 100);

        $response = $this->actingAs($admin)
            ->post(route('admin.doctors.update', $doctor), [
                '_method' => 'put',
                'name' => 'Dr. Samuel Hahnemann',
                'signature' => $signatureFile,
                'seal' => $sealFile,
            ]);

        $response->assertRedirect(route('admin.doctors.index'));

        $doctor->refresh();
        $this->assertNotNull($doctor->signature_path);
        $this->assertNotNull($doctor->seal_path);

        Storage::disk('public')->assertExists($doctor->signature_path);
        Storage::disk('public')->assertExists($doctor->seal_path);

        $sigResponse = $this->get(route('doctors.signature', $doctor));
        $sigResponse->assertOk();
        $sigResponse->assertHeader('X-Content-Type-Options', 'nosniff');

        $sealResponse = $this->get(route('doctors.seal', $doctor));
        $sealResponse->assertOk();
        $sealResponse->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_prescription_pdf_supports_pre_printed_pad_mode(): void
    {
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('Super Admin');
        $admin->givePermissionTo(['clinical_records.view', 'patients.view', 'visits.view', 'visits.export']);

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Holistic Clinic',
            'phone' => '+8801700000000',
            'address' => 'Dhaka, Bangladesh',
            'doctor_name' => 'Dr. Lead Practitioner',
            'doctor_credentials' => 'BHMS',
        ]);

        $patient = Patient::factory()->create([
            'name' => 'John Doe',
            'phone' => '+8801711111111',
            'gender' => 'male',
        ]);

        $doctor = Doctor::create([
            'name' => 'Dr. Lead Practitioner',
            'qualification' => 'BHMS (Gold Medalist)',
            'is_active' => true,
        ]);

        $visit = Visit::factory()->finalized()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Headache and fever',
            'finalized_at' => now(),
            'finalized_by' => $admin->id,
            'patient_snapshot' => [
                'name' => 'John Doe',
                'patient_identifier' => 'T-1',
                'patient_id' => '1',
                'phone' => '+8801711111111',
                'gender' => 'male',
            ],
            'prescription_authorizer_snapshot' => [
                'authorized_at' => now()->toIso8601String(),
                'doctor_name' => 'Dr. Lead Practitioner',
            ],
        ]);

        $medicine = Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '200C',
            'form' => 'drops',
        ]);

        PrescriptionItem::create([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'sort_order' => 0,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 4,
            'dose_unit' => 'drops',
            'dilution_note' => 'With half cup water',
            'duration_days' => 7,
            'prescription_version' => 1,
            'prescription_snapshot' => [
                'medicine_id' => $medicine->id,
                'medicine_name' => $medicine->name,
                'potency' => $medicine->potency,
                'formulation' => $medicine->form,
                'authorizer' => [
                    'authorized_by_user_id' => $admin->id,
                    'authorized_at' => now()->toISOString(),
                ],
                'provenance' => [
                    'kind' => 'prescriber_authorized_capture',
                    'status' => 'captured_at_authorization',
                    'captured_at' => now()->toISOString(),
                ],
                'directions' => [
                    'timing' => ['morning'],
                    'before_after' => 'after',
                    'dose_qty' => 4,
                    'dose_unit' => 'drops',
                    'dilution_note' => 'With half cup water',
                    'duration_days' => 7,
                ],
            ],
        ]);

        // Regular PDF export
        $responseRegular = $this->actingAs($admin)->get(route('admin.visits.pdf', $visit));
        $responseRegular->assertOk();
        $responseRegular->assertHeader('Content-Type', 'application/pdf');

        // Pre-printed pad mode export
        $responsePrePrinted = $this->actingAs($admin)->get(route('admin.visits.pdf', [$visit, 'pre_printed' => 1]));
        $responsePrePrinted->assertOk();
        $responsePrePrinted->assertHeader('Content-Type', 'application/pdf');
    }
}
