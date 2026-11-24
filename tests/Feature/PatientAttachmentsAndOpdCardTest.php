<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\PatientAttachment;
use App\Models\PatientNumberingProfile;
use App\Models\User;
use App\Services\BarcodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PatientAttachmentsAndOpdCardTest extends TestCase
{
    use RefreshDatabase;

    private User $doctorUser;

    private User $unauthorizedUser;

    private PatientNumberingProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $permissions = [
            'patients.view',
            'patients.create',
            'patients.update',
            'patients.delete',
            'clinical_records.view',
            'attachments.view',
            'attachments.create',
            'attachments.delete',
            'visits.view',
            'visits.create',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo($permissions);

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        $this->doctorUser = User::factory()->create([
            'email' => 'doctor@remediq.test',
            'password' => bcrypt('password'),
        ]);
        $this->doctorUser->assignRole('Doctor');

        $this->unauthorizedUser = User::factory()->create([
            'email' => 'staff@remediq.test',
            'password' => bcrypt('password'),
        ]);

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Diagnostic Care',
            'doctor_name' => 'Dr. A. Rahman',
            'doctor_credentials' => 'MBBS, BHMS',
            'phone' => '+8801712345678',
            'address' => 'Mirpur, Dhaka',
            'practice_type' => 'integrative_dual',
        ]);

        $this->profile = PatientNumberingProfile::create([
            'name' => 'General OPD',
            'category' => 'general',
            'prefix' => 'PAT',
            'number_padding' => 5,
            'starting_number' => 100,
            'is_default' => true,
            'is_active' => true,
        ]);
    }

    public function test_barcode_service_generates_valid_svg_code_128(): void
    {
        $service = new BarcodeService;
        $svg = $service->generateCode128Svg('PAT-2026-00100');

        $this->assertStringContainsString('<svg', $svg);
        $this->assertStringContainsString('<rect', $svg);
        $this->assertStringContainsString('</svg>', $svg);

        $dataUri = $service->generateCode128DataUri('PAT-2026-00100');
        $this->assertStringStartsWith('data:image/svg+xml;base64,', $dataUri);
    }

    public function test_user_with_permission_can_upload_patient_attachment(): void
    {
        $patient = Patient::factory()->create([
            'patient_numbering_profile_id' => $this->profile->id,
            'patient_no' => 101,
            'patient_code' => 'PAT-00101',
            'name' => 'Rahim Uddin',
        ]);

        $file = UploadedFile::fake()->create('cbc_blood_test.pdf', 1024, 'application/pdf');

        $response = $this->actingAs($this->doctorUser)
            ->post(route('admin.patients.attachments.store', $patient->id), [
                'title' => 'Complete Blood Count (CBC)',
                'category' => 'blood_test',
                'file' => $file,
                'notes' => 'Hemoglobin level slightly low (11.2 g/dL)',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('patient_attachments', [
            'patient_id' => $patient->id,
            'title' => 'Complete Blood Count (CBC)',
            'category' => 'blood_test',
            'file_name' => 'cbc_blood_test.pdf',
            'mime_type' => 'application/pdf',
            'uploaded_by' => $this->doctorUser->id,
        ]);

        $attachment = PatientAttachment::where('patient_id', $patient->id)->firstOrFail();
        $this->assertTrue(Storage::disk('public')->exists($attachment->file_path));
    }

    public function test_unauthorized_user_cannot_upload_attachment(): void
    {
        $patient = Patient::factory()->create([
            'patient_numbering_profile_id' => $this->profile->id,
            'patient_no' => 102,
            'patient_code' => 'PAT-00102',
            'name' => 'Karim Mia',
        ]);

        $file = UploadedFile::fake()->create('report.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->unauthorizedUser)
            ->post(route('admin.patients.attachments.store', $patient->id), [
                'title' => 'Chest X-Ray',
                'category' => 'x_ray',
                'file' => $file,
            ]);

        $response->assertForbidden();
    }

    public function test_user_can_view_and_download_attachment_file(): void
    {
        $patient = Patient::factory()->create([
            'patient_numbering_profile_id' => $this->profile->id,
            'patient_no' => 103,
            'patient_code' => 'PAT-00103',
            'name' => 'Sultana Begum',
        ]);

        $fakePath = 'attachments/patient_'.$patient->id.'/ultrasound.png';
        Storage::disk('public')->put($fakePath, 'fake-png-content');

        $attachment = PatientAttachment::create([
            'patient_id' => $patient->id,
            'title' => 'Whole Abdomen USG',
            'category' => 'usg',
            'file_path' => $fakePath,
            'file_name' => 'ultrasound.png',
            'mime_type' => 'image/png',
            'file_size_bytes' => 16,
            'uploaded_by' => $this->doctorUser->id,
        ]);

        // View inline
        $viewResponse = $this->actingAs($this->doctorUser)
            ->get(route('admin.attachments.show', $attachment->id));
        $viewResponse->assertOk();
        $this->assertSame('image/png', $viewResponse->headers->get('Content-Type'));

        // Download
        $downloadResponse = $this->actingAs($this->doctorUser)
            ->get(route('admin.attachments.download', $attachment->id));
        $downloadResponse->assertOk();
        $this->assertStringContainsString('attachment;', (string) $downloadResponse->headers->get('Content-Disposition'));

        // Delete
        $deleteResponse = $this->actingAs($this->doctorUser)
            ->delete(route('admin.attachments.destroy', $attachment->id));
        $deleteResponse->assertRedirect();

        $this->assertDatabaseMissing('patient_attachments', ['id' => $attachment->id]);
        $this->assertFalse(Storage::disk('public')->exists($fakePath));
    }

    public function test_user_can_store_and_update_patient_with_photo_file_upload(): void
    {
        $file = UploadedFile::fake()->image('patient_avatar.jpg', 400, 400);

        $response = $this->actingAs($this->doctorUser)
            ->post(route('admin.patients.store'), [
                'name' => 'Fatima Khatun',
                'patient_numbering_profile_id' => $this->profile->id,
                'gender' => 'female',
                'age_years' => 32,
                'phone' => '01711223344',
                'photo' => $file,
            ]);

        $response->assertRedirect(route('admin.patients.index'));

        $patient = Patient::where('name', 'Fatima Khatun')->firstOrFail();
        $this->assertNotNull($patient->photo_path);
        $this->assertTrue(Storage::disk('public')->exists($patient->photo_path));
        $this->assertNotNull($patient->photo_url);

        // Update: remove photo
        $updateResponse = $this->actingAs($this->doctorUser)
            ->put(route('admin.patients.update', $patient->id), [
                'name' => 'Fatima Khatun Updated',
                'gender' => 'female',
                'age_years' => 32,
                'phone' => '01711223344',
                'remove_photo' => true,
            ]);

        $updateResponse->assertRedirect(route('admin.patients.index'));
        $patient->refresh();
        $this->assertNull($patient->photo_path);
    }

    public function test_user_can_store_and_update_patient_with_mobile_camera_photo_upload(): void
    {
        // Simulate high-resolution photo captured directly by mobile device camera input (capture="environment")
        $mobilePhoto = UploadedFile::fake()->image('camera_capture_1280x720.jpg', 1280, 720);

        $response = $this->actingAs($this->doctorUser)
            ->post(route('admin.patients.store'), [
                'name' => 'Mobile Camera Patient',
                'patient_numbering_profile_id' => $this->profile->id,
                'gender' => 'male',
                'age_years' => 28,
                'phone' => '01799887766',
                'photo' => $mobilePhoto,
            ]);

        $response->assertRedirect(route('admin.patients.index'));

        $patient = Patient::where('name', 'Mobile Camera Patient')->firstOrFail();
        $this->assertNotNull($patient->photo_path);
        $this->assertTrue(Storage::disk('public')->exists($patient->photo_path));
        $this->assertNotNull($patient->photo_url);

        $oldPhotoPath = $patient->photo_path;

        // Replace with new mobile camera capture
        $newMobilePhoto = UploadedFile::fake()->image('camera_capture_new.jpg', 1280, 720);
        $updateResponse = $this->actingAs($this->doctorUser)
            ->put(route('admin.patients.update', $patient->id), [
                'name' => 'Mobile Camera Patient',
                'gender' => 'male',
                'age_years' => 28,
                'phone' => '01799887766',
                'photo' => $newMobilePhoto,
            ]);

        $updateResponse->assertRedirect(route('admin.patients.index'));
        $patient->refresh();
        $this->assertNotNull($patient->photo_path);
        $this->assertNotSame($oldPhotoPath, $patient->photo_path);
        $this->assertTrue(Storage::disk('public')->exists($patient->photo_path));
        $this->assertFalse(Storage::disk('public')->exists($oldPhotoPath));
    }

    public function test_user_can_store_patient_with_webcam_base64_photo(): void
    {
        // 1x1 transparent PNG data URI
        $base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $response = $this->actingAs($this->doctorUser)
            ->post(route('admin.patients.store'), [
                'name' => 'Webcam Patient',
                'patient_numbering_profile_id' => $this->profile->id,
                'gender' => 'male',
                'age_years' => 45,
                'phone' => '01811223344',
                'photo_webcam_data' => $base64Image,
            ]);

        $response->assertRedirect(route('admin.patients.index'));

        $patient = Patient::where('name', 'Webcam Patient')->firstOrFail();
        $this->assertNotNull($patient->photo_path);
        $this->assertTrue(Storage::disk('public')->exists($patient->photo_path));
        $this->assertStringEndsWith('.png', $patient->photo_path);
    }

    public function test_user_can_access_printable_opd_card_and_pdf(): void
    {
        $patient = Patient::factory()->create([
            'patient_numbering_profile_id' => $this->profile->id,
            'patient_no' => 105,
            'patient_code' => 'PAT-00105',
            'name' => 'Kamal Hossain',
            'gender' => 'male',
            'age_years' => 50,
            'blood_group' => 'B+',
            'phone' => '01911223344',
            'dob' => '1976-05-15',
        ]);

        // HTML / Inertia Preview
        $response = $this->actingAs($this->doctorUser)
            ->get(route('admin.patients.opd_card', $patient->id));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Patients/OpdCard')
            ->has('patient')
            ->has('clinic')
            ->has('barcodeSvg')
            ->where('patient.patient_identifier', $patient->patient_identifier)
            ->where('patient.dob', '1976-05-15')
        );

        // Super Admin access
        $superAdmin = User::factory()->create(['email' => 'admin-opd@remediq.test']);
        $superAdmin->assignRole('Super Admin');

        $adminResponse = $this->actingAs($superAdmin)
            ->get(route('admin.patients.opd_card', $patient->id));
        $adminResponse->assertOk();

        // Patient with no custom code falls back gracefully to patient_no
        $barePatient = Patient::factory()->create([
            'name' => 'Bare Patient',
            'gender' => 'female',
            'patient_code' => null,
            'patient_no' => 999,
            'patient_series' => 'B',
        ]);
        $bareResponse = $this->actingAs($superAdmin)
            ->get(route('admin.patients.opd_card', $barePatient->id));
        $bareResponse->assertOk();
        $this->assertSame('999B', $barePatient->patient_identifier);

        // PDF Stream Export
        $pdfResponse = $this->actingAs($this->doctorUser)
            ->get(route('admin.patients.opd_card', ['patient' => $patient->id, 'format' => 'pdf']));

        $pdfResponse->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $pdfResponse->headers->get('Content-Type'));
    }
}
