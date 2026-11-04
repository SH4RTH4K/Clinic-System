<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Symptom;
use App\Models\SymptomMedicineMap;
use App\Models\User;
use App\Models\Visit;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DoctorDefaultPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_doctor_receives_care_permissions_without_delete_or_approval_authority(): void
    {
        $this->seedApplicationDefaults();

        $doctor = Role::query()->where('name', 'Doctor')->firstOrFail();

        foreach ([
            'patients.view', 'patients.create', 'patients.update',
            'visits.view', 'visits.create', 'visits.update',
            'medicines.view',
            'symptoms.view',
            'symptom_medicine_map.view',
        ] as $permissionName) {
            $this->assertTrue($doctor->hasPermissionTo($permissionName), "Expected {$permissionName} for the Doctor role.");
        }

        foreach ([
            'patients.delete', 'visits.delete', 'medicines.delete', 'symptoms.delete',
            'medicines.create', 'medicines.update',
            'symptoms.create', 'symptoms.update',
            'symptom_medicine_map.create', 'symptom_medicine_map.update', 'symptom_medicine_map.delete',
            'visits.finalize', 'visits.cancel', 'visits.cancel_other', 'symptom_medicine_map.review',
        ] as $permissionName) {
            $this->assertFalse($doctor->hasPermissionTo($permissionName), "Unexpected {$permissionName} grant on the Doctor role.");
        }

        $superAdmin = Role::query()->where('name', 'Super Admin')->firstOrFail();
        foreach ([
            'visits.finalize', 'visits.cancel', 'visits.cancel_other',
            'medicines.create', 'medicines.update', 'medicines.delete',
            'symptoms.create', 'symptoms.update', 'symptoms.delete',
            'symptom_medicine_map.create', 'symptom_medicine_map.update', 'symptom_medicine_map.delete', 'symptom_medicine_map.review',
        ] as $permissionName) {
            $this->assertFalse($superAdmin->hasPermissionTo($permissionName));
        }
    }

    public function test_default_doctor_cannot_delete_patients_visits_medicines_symptoms_or_mappings(): void
    {
        $this->seedApplicationDefaults();
        $doctor = User::factory()->create(['must_change_password' => false]);
        $doctor->assignRole('Doctor');
        $this->assertTrue($doctor->can('clinical_records.view'));
        $this->assertTrue($doctor->can('visits.view'));

        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id, 'status' => 'draft']);
        $medicine = Medicine::query()->create([
            'name' => 'Synthetic least privilege medicine',
            'potency' => 'synthetic',
            'form' => 'drops',
            'is_active' => true,
        ]);
        $symptom = Symptom::query()->create([
            'name_en' => 'Synthetic least privilege symptom',
            'is_active' => true,
        ]);
        $mapping = SymptomMedicineMap::query()->create([
            'symptom_id' => $symptom->id,
            'medicine_id' => $medicine->id,
            'priority' => 1,
            'is_approved' => false,
            'review_status' => 'draft',
        ]);

        $this->actingAs($doctor)
            ->delete(route('admin.patients.destroy', $patient))
            ->assertForbidden();
        $this->actingAs($doctor)
            ->delete(route('admin.visits.destroy', $visit))
            ->assertForbidden();
        $this->actingAs($doctor)
            ->delete(route('admin.medicines.destroy', $medicine))
            ->assertForbidden();
        $this->actingAs($doctor)
            ->delete(route('admin.symptoms.destroy', $symptom))
            ->assertForbidden();
        $this->actingAs($doctor)
            ->delete(route('admin.symptom_medicine_map.destroy', $mapping))
            ->assertForbidden();

        $this->actingAs($doctor)
            ->post(route('admin.medicines.store'), [
                'name' => 'Unauthorized synthetic medicine',
                'potency' => '30C',
                'form' => 'drops',
            ])
            ->assertForbidden();
        $this->actingAs($doctor)
            ->put(route('admin.medicines.update', $medicine), [
                'name' => 'Changed synthetic medicine',
                'potency' => $medicine->potency,
                'form' => $medicine->form,
            ])
            ->assertForbidden();
        $this->actingAs($doctor)
            ->post(route('admin.symptoms.store'), ['name_en' => 'Unauthorized synthetic symptom'])
            ->assertForbidden();
        $this->actingAs($doctor)
            ->put(route('admin.symptoms.update', $symptom), ['name_en' => 'Changed synthetic symptom'])
            ->assertForbidden();
        $this->actingAs($doctor)
            ->post(route('admin.symptom_medicine_map.store'), [
                'symptom_id' => $symptom->id,
                'medicine_id' => $medicine->id,
                'priority' => 2,
            ])
            ->assertForbidden();
        $this->actingAs($doctor)
            ->put(route('admin.symptom_medicine_map.update', $mapping), [
                'symptom_id' => $symptom->id,
                'medicine_id' => $medicine->id,
                'priority' => 2,
            ])
            ->assertForbidden();
        $this->actingAs($doctor)
            ->post(route('admin.symptom_medicine_map.review', $mapping), [
                'decision' => 'approved',
                'review_acknowledged' => true,
            ])
            ->assertForbidden();

        $this->assertModelExists($patient);
        $this->assertModelExists($visit);
        $this->assertModelExists($medicine);
        $this->assertModelExists($symptom);
        $this->assertModelExists($mapping);
        $this->assertSame('Synthetic least privilege medicine', $medicine->fresh()->name);
        $this->assertSame('Synthetic least privilege symptom', $symptom->fresh()->name_en);
        $this->assertDatabaseCount('medicines', 1);
        $this->assertDatabaseCount('symptoms', 1);
        $this->assertDatabaseCount('symptom_medicine_map', 1);
    }

    public function test_doctor_can_view_approved_reference_suggestions_without_creating_prescriptions(): void
    {
        $this->seedApplicationDefaults();
        $doctor = User::factory()->create(['must_change_password' => false]);
        $doctor->assignRole('Doctor');
        $this->assertTrue($doctor->can('clinical_records.view'));
        $this->assertTrue($doctor->can('visits.view'));
        $medicine = Medicine::query()->create([
            'name' => 'Synthetic approved reference medicine',
            'potency' => '30C',
            'form' => 'drops',
            'is_active' => true,
        ]);
        $symptom = Symptom::query()->create([
            'name_en' => 'Synthetic approved reference symptom',
            'is_active' => true,
        ]);
        SymptomMedicineMap::query()->create([
            'symptom_id' => $symptom->id,
            'medicine_id' => $medicine->id,
            'priority' => 1,
            'is_approved' => true,
            'review_status' => 'approved',
            'source_title' => 'Synthetic documented source',
        ]);

        $this->actingAs($doctor)
            ->getJson(route('admin.visits.suggestions', ['symptoms' => [$symptom->id]]))
            ->assertOk()
            ->assertJsonPath('0.medicine_id', $medicine->id);

        $this->assertDatabaseCount('visits', 0);
        $this->assertDatabaseCount('prescription_items', 0);
    }

    public function test_explicit_specialist_permissions_allow_catalog_maintenance_and_review(): void
    {
        $this->seedApplicationDefaults();

        $medicineManager = $this->userForRoleWithPermissions('Medicine Manager', ['medicines.create', 'medicines.update']);
        $symptomEditor = $this->userForRoleWithPermissions('Symptom Editor', ['symptoms.create', 'symptoms.update']);
        $referenceEditor = $this->userForRoleWithPermissions('Reference Editor', ['symptom_medicine_map.create', 'symptom_medicine_map.update']);
        $reviewer = $this->userForRoleWithPermissions('Clinical Reviewer', ['symptom_medicine_map.review']);

        $this->actingAs($medicineManager)->post(route('admin.medicines.store'), [
            'name' => 'Managed synthetic medicine',
            'potency' => '30C',
            'form' => 'drops',
        ])->assertRedirect(route('admin.medicines.index'));
        $medicine = Medicine::query()->firstOrFail();
        $this->actingAs($medicineManager)->put(route('admin.medicines.update', $medicine), [
            'name' => 'Updated managed synthetic medicine',
            'potency' => '30C',
            'form' => 'drops',
        ])->assertRedirect(route('admin.medicines.index'));

        $this->actingAs($symptomEditor)->post(route('admin.symptoms.store'), [
            'name_en' => 'Managed synthetic symptom',
        ])->assertRedirect(route('admin.symptoms.index'));
        $symptom = Symptom::query()->firstOrFail();
        $this->actingAs($symptomEditor)->put(route('admin.symptoms.update', $symptom), [
            'name_en' => 'Updated managed synthetic symptom',
        ])->assertRedirect(route('admin.symptoms.index'));

        $this->actingAs($referenceEditor)->post(route('admin.symptom_medicine_map.store'), [
            'symptom_id' => $symptom->id,
            'medicine_id' => $medicine->id,
            'priority' => 1,
            'source_title' => 'Synthetic review source',
        ])->assertRedirect();
        $mapping = SymptomMedicineMap::query()->firstOrFail();
        $this->actingAs($referenceEditor)->put(route('admin.symptom_medicine_map.update', $mapping), [
            'symptom_id' => $symptom->id,
            'medicine_id' => $medicine->id,
            'priority' => 2,
            'source_title' => 'Synthetic review source',
        ])->assertRedirect();
        $mapping->update(['review_status' => 'pending_review']);

        $this->actingAs($reviewer)->post(route('admin.symptom_medicine_map.review', $mapping), [
            'decision' => 'approved',
            'review_acknowledged' => true,
        ])->assertRedirect();

        $this->assertSame('approved', $mapping->fresh()->review_status);
        $this->assertSame('Updated managed synthetic medicine', $medicine->fresh()->name);
        $this->assertSame('Updated managed synthetic symptom', $symptom->fresh()->name_en);
    }

    public function test_reseeding_default_permissions_does_not_revoke_existing_role_grants(): void
    {
        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $deletePermission = Permission::firstOrCreate(['name' => 'patients.delete', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo($deletePermission);
        $catalogPermission = Permission::firstOrCreate(['name' => 'medicines.create', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo($catalogPermission);
        $user = User::factory()->create(['must_change_password' => false]);
        $user->assignRole($doctorRole);

        $this->seedApplicationDefaults();

        $this->assertTrue($doctorRole->fresh()->hasPermissionTo($deletePermission));
        $this->assertTrue($doctorRole->fresh()->hasPermissionTo($catalogPermission));
        $this->assertTrue($user->fresh()->hasRole('Doctor'));
        $this->assertTrue($user->fresh()->can('patients.delete'));
    }

    private function seedApplicationDefaults(): void
    {
        $previousPassword = getenv('SEED_ADMIN_PASSWORD');
        putenv('SEED_ADMIN_PASSWORD=synthetic-test-seed-password');

        try {
            $this->seed(DatabaseSeeder::class);
        } finally {
            if ($previousPassword === false) {
                putenv('SEED_ADMIN_PASSWORD');
            } else {
                putenv('SEED_ADMIN_PASSWORD='.$previousPassword);
            }
        }
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userForRoleWithPermissions(string $roleName, array $permissions): User
    {
        $role = Role::query()->create(['name' => $roleName, 'guard_name' => 'web']);
        $role->givePermissionTo($permissions);
        $user = User::factory()->create(['must_change_password' => false]);
        $user->assignRole($role);

        return $user;
    }
}
