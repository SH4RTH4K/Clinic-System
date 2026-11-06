<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DoctorPhotoControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_doctor_photo_is_streamed_from_private_storage_without_public_symlink(): void
    {
        Storage::fake('public');
        $photoBytes = $this->storeSyntheticPng('synthetic-doctor.png');

        $doctor = Doctor::query()->create([
            'name' => 'Synthetic Public Doctor',
            'is_active' => true,
            'photo_path' => 'doctors/synthetic-doctor.png',
        ]);

        $this->get(route('doctors.photo', $doctor))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertStreamedContent($photoBytes);
    }

    public function test_inactive_doctor_photo_is_not_available_on_the_public_route(): void
    {
        Storage::fake('public');
        $this->storeSyntheticPng('inactive-doctor.png');

        $doctor = Doctor::query()->create([
            'name' => 'Synthetic Inactive Doctor',
            'is_active' => false,
            'photo_path' => 'doctors/inactive-doctor.png',
        ]);

        $this->get(route('doctors.photo', $doctor))->assertNotFound();
    }

    public function test_active_doctor_photo_is_served_from_legacy_public_storage_when_disk_copy_is_missing(): void
    {
        Storage::fake('public');
        $photoBytes = UploadedFile::fake()->image('legacy-doctor.png', 1, 1)->getContent();
        $temporaryPublicPath = storage_path('framework/testing/doctor-photo-'.uniqid('', true));
        $legacyPhotoPath = $temporaryPublicPath.'/storage/doctors/legacy-doctor.png';

        File::ensureDirectoryExists(dirname($legacyPhotoPath));
        file_put_contents($legacyPhotoPath, $photoBytes);
        $this->app->usePublicPath($temporaryPublicPath);

        $doctor = Doctor::query()->create([
            'name' => 'Synthetic Legacy Photo Doctor',
            'is_active' => true,
            'photo_path' => 'doctors/legacy-doctor.png',
        ]);

        try {
            $this->get(route('doctors.photo', $doctor))
                ->assertOk()
                ->assertHeader('Content-Type', 'image/png')
                ->assertStreamedContent($photoBytes);
        } finally {
            File::deleteDirectory($temporaryPublicPath);
        }
    }

    public function test_super_admin_can_view_an_inactive_doctor_photo_in_admin(): void
    {
        Storage::fake('public');
        $photoBytes = $this->storeSyntheticPng('admin-doctor.png');

        $doctor = Doctor::query()->create([
            'name' => 'Synthetic Admin Doctor',
            'is_active' => false,
            'photo_path' => 'doctors/admin-doctor.png',
        ]);
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole(Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']));

        $this->actingAs($superAdmin)
            ->get(route('admin.doctors.photo', $doctor))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertStreamedContent($photoBytes);
    }

    public function test_doctor_photo_path_outside_the_doctor_upload_folder_is_rejected(): void
    {
        $doctor = Doctor::query()->create([
            'name' => 'Synthetic Invalid Path Doctor',
            'is_active' => true,
            'photo_path' => 'doctors/../private/sensitive.png',
        ]);

        $this->get(route('doctors.photo', $doctor))->assertNotFound();
    }

    private function storeSyntheticPng(string $filename): string
    {
        $path = Storage::disk('public')->putFileAs(
            'doctors',
            UploadedFile::fake()->image($filename, 1, 1),
            $filename,
        );

        return Storage::disk('public')->get($path);
    }
}
