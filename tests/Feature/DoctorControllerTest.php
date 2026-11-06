<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DoctorControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['doctors.create', 'doctors.update'] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }
        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    }

    public function test_authorized_user_can_create_a_doctor_and_explicitly_set_active_status(): void
    {
        $user = $this->userWithPermissions(['doctors.create']);

        $this->actingAs($user)
            ->post(route('admin.doctors.store'), ['name' => 'Synthetic Doctor', 'is_active' => 'true'])
            ->assertRedirect(route('admin.doctors.index'));

        $this->assertDatabaseHas('doctors', ['name' => 'Synthetic Doctor', 'is_active' => true]);
    }

    public function test_super_admin_without_doctor_permissions_can_open_and_create_doctor_profile(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole('Super Admin');

        $this->actingAs($user)
            ->get(route('admin.doctors.create'))
            ->assertOk();

        $this->actingAs($user)
            ->post(route('admin.doctors.store'), ['name' => 'Synthetic Super Admin Doctor', 'is_active' => 'true'])
            ->assertRedirect(route('admin.doctors.index'));

        $this->assertDatabaseHas('doctors', ['name' => 'Synthetic Super Admin Doctor', 'is_active' => true]);
    }

    public function test_unauthorized_user_cannot_create_or_edit_doctor_profiles(): void
    {
        $doctor = Doctor::query()->create(['name' => 'Protected Synthetic Doctor']);
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);

        $this->actingAs($user)
            ->post(route('admin.doctors.store'), ['name' => 'Unauthorized Synthetic Doctor'])
            ->assertForbidden();
        $this->actingAs($user)
            ->put(route('admin.doctors.update', $doctor), ['name' => 'Changed Synthetic Doctor'])
            ->assertForbidden();

        $this->assertDatabaseMissing('doctors', ['name' => 'Unauthorized Synthetic Doctor']);
        $this->assertSame('Protected Synthetic Doctor', $doctor->fresh()->name);
    }

    public function test_invalid_doctor_input_is_rejected(): void
    {
        $this->actingAs($this->userWithPermissions(['doctors.create']))
            ->post(route('admin.doctors.store'), [
                'name' => str_repeat('x', 256),
                'email' => 'not-an-email',
                'social_facebook' => 'javascript:alert(1)',
            ])
            ->assertSessionHasErrors(['name', 'email', 'social_facebook']);

        $this->assertDatabaseCount('doctors', 0);
    }

    public function test_omitted_active_status_preserves_active_and_inactive_doctors(): void
    {
        $user = $this->userWithPermissions(['doctors.update']);
        $activeDoctor = Doctor::query()->create(['name' => 'Active Synthetic Doctor', 'is_active' => true]);
        $inactiveDoctor = Doctor::query()->create(['name' => 'Inactive Synthetic Doctor', 'is_active' => false]);

        $this->actingAs($user)
            ->put(route('admin.doctors.update', $activeDoctor), ['name' => 'Active Synthetic Doctor Updated'])
            ->assertRedirect(route('admin.doctors.index'));
        $this->actingAs($user)
            ->put(route('admin.doctors.update', $inactiveDoctor), ['name' => 'Inactive Synthetic Doctor Updated'])
            ->assertRedirect(route('admin.doctors.index'));

        $this->assertTrue((bool) $activeDoctor->fresh()->is_active);
        $this->assertFalse((bool) $inactiveDoctor->fresh()->is_active);
    }

    public function test_replacing_doctor_photo_deletes_the_old_legacy_public_storage_file(): void
    {
        Storage::fake('public');
        $temporaryPublicPath = storage_path('framework/testing/doctor-photo-replacement-'.uniqid('', true));
        $oldPhotoPath = $temporaryPublicPath.'/storage/doctors/old-doctor.png';
        $oldPhotoBytes = UploadedFile::fake()->image('old-doctor.png', 1, 1)->getContent();

        File::ensureDirectoryExists(dirname($oldPhotoPath));
        file_put_contents($oldPhotoPath, $oldPhotoBytes);
        $this->app->usePublicPath($temporaryPublicPath);

        $doctor = Doctor::query()->create([
            'name' => 'Synthetic Photo Replacement Doctor',
            'photo_path' => 'doctors/old-doctor.png',
        ]);
        $user = $this->userWithPermissions(['doctors.update']);

        try {
            $this->actingAs($user)
                ->put(route('admin.doctors.update', $doctor), [
                    'name' => 'Synthetic Photo Replacement Doctor',
                    'photo' => UploadedFile::fake()->image('new-doctor.png', 1, 1),
                ])
                ->assertRedirect(route('admin.doctors.index'));

            $newPhotoPath = $doctor->fresh()->photo_path;

            $this->assertNotSame('doctors/old-doctor.png', $newPhotoPath);
            $this->assertFileDoesNotExist($oldPhotoPath);
            $this->assertTrue(Storage::disk('public')->exists($newPhotoPath));
        } finally {
            File::deleteDirectory($temporaryPublicPath);
        }
    }

    public function test_explicit_active_status_values_activate_or_deactivate_a_doctor(): void
    {
        $user = $this->userWithPermissions(['doctors.update']);
        $doctor = Doctor::query()->create(['name' => 'Status Synthetic Doctor', 'is_active' => true]);

        $this->actingAs($user)
            ->put(route('admin.doctors.update', $doctor), ['name' => $doctor->name, 'is_active' => 'false'])
            ->assertRedirect(route('admin.doctors.index'));
        $this->assertFalse((bool) $doctor->fresh()->is_active);

        $this->actingAs($user)
            ->put(route('admin.doctors.update', $doctor), ['name' => $doctor->name, 'is_active' => 'true'])
            ->assertRedirect(route('admin.doctors.index'));
        $this->assertTrue((bool) $doctor->fresh()->is_active);
    }

    public function test_malformed_active_status_is_rejected_without_changing_doctor_status(): void
    {
        $user = $this->userWithPermissions(['doctors.update']);
        $doctor = Doctor::query()->create(['name' => 'Status Synthetic Doctor', 'is_active' => true]);

        $this->actingAs($user)
            ->put(route('admin.doctors.update', $doctor), ['name' => $doctor->name, 'is_active' => 'sometimes'])
            ->assertSessionHasErrors('is_active');

        $this->assertTrue((bool) $doctor->fresh()->is_active);
    }

    public function test_only_super_admin_can_link_doctor_accounts_and_invalid_links_are_rejected(): void
    {
        $account = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $nonAdmin = $this->userWithPermissions(['doctors.create']);

        $this->actingAs($nonAdmin)
            ->post(route('admin.doctors.store'), ['name' => 'Unlinked Synthetic Doctor', 'user_id' => $account->id])
            ->assertRedirect(route('admin.doctors.index'));
        $this->assertNull(Doctor::query()->where('name', 'Unlinked Synthetic Doctor')->firstOrFail()->user_id);

        $admin = $this->superAdmin();
        $linkedDoctor = Doctor::query()->create(['name' => 'Linked Synthetic Doctor', 'user_id' => $account->id]);
        $this->actingAs($admin)
            ->post(route('admin.doctors.store'), ['name' => 'Duplicate Link Synthetic Doctor', 'user_id' => $account->id])
            ->assertSessionHasErrors('user_id');

        $inactiveAccount = User::factory()->create(['is_active' => false, 'must_change_password' => false]);
        $this->actingAs($admin)
            ->put(route('admin.doctors.update', $linkedDoctor), ['name' => $linkedDoctor->name, 'user_id' => $inactiveAccount->id])
            ->assertSessionHasErrors('user_id');

        $this->assertSame($account->id, $linkedDoctor->fresh()->user_id);
        $this->assertDatabaseMissing('doctors', ['name' => 'Duplicate Link Synthetic Doctor']);
    }

    public function test_historical_visit_blocks_account_relinking_and_preserves_doctor_attribution(): void
    {
        $admin = $this->superAdmin();
        $originalAccount = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $replacementAccount = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $doctor = Doctor::query()->create(['name' => 'Historical Synthetic Doctor', 'user_id' => $originalAccount->id]);
        $visit = Visit::factory()->create(['doctor_id' => $doctor->id]);
        $visit->delete();

        $this->actingAs($admin)
            ->put(route('admin.doctors.update', $doctor), ['name' => $doctor->name, 'user_id' => $replacementAccount->id])
            ->assertSessionHasErrors('user_id');

        $this->assertSame($originalAccount->id, $doctor->fresh()->user_id);
        $this->assertSame($doctor->id, Visit::withTrashed()->findOrFail($visit->id)->doctor_id);
    }

    public function test_doctor_profile_edit_does_not_change_finalized_prescriber_snapshot(): void
    {
        $user = $this->userWithPermissions(['doctors.update']);
        $doctor = Doctor::query()->create(['name' => 'Snapshot Synthetic Doctor', 'user_id' => $user->id]);
        $visit = Visit::factory()->finalized()->create([
            'doctor_id' => $doctor->id,
            'prescriber_snapshot' => [
                'doctor_id' => $doctor->id,
                'doctor_name' => 'Snapshot Synthetic Doctor',
                'authorized_by_user_id' => $user->id,
            ],
        ]);
        $snapshot = $visit->prescriber_snapshot;

        $this->actingAs($user)
            ->put(route('admin.doctors.update', $doctor), ['name' => 'Changed Profile Display Name'])
            ->assertRedirect(route('admin.doctors.index'));

        $this->assertSame($snapshot, $visit->fresh()->prescriber_snapshot);
        $this->assertSame($doctor->id, $visit->fresh()->doctor_id);
    }

    /** @param list<string> $permissions */
    private function userWithPermissions(array $permissions): User
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo($permissions);

        return $user;
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole('Super Admin');

        return $user;
    }
}
