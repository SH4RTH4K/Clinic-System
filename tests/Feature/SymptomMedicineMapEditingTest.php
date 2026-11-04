<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\Symptom;
use App\Models\SymptomMedicineMap;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SymptomMedicineMapEditingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('local');

        foreach (['symptom_medicine_map.view', 'symptom_medicine_map.create', 'symptom_medicine_map.update', 'symptom_medicine_map.delete', 'clinical_records.view'] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        foreach (['Doctor', 'Receptionist'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }
    }

    public function test_authorized_user_can_open_and_update_mapping_fields_with_a_privacy_safe_audit_record(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.view', 'symptom_medicine_map.update']);
        $mapping = $this->mapping(['priority' => 5, 'note' => 'Original clinical note.']);

        $this->actingAs($actor)
            ->get(route('admin.symptom_medicine_map.edit', $mapping))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/SymptomMedicineMap/Edit')
                ->where('mapping.id', $mapping->id)
                ->where('mapping.priority', 5));

        $this->actingAs($actor)
            ->put(route('admin.symptom_medicine_map.update', $mapping), $this->payload($mapping, [
                'priority' => 2,
                'note' => 'Updated private clinical note.',
            ]))
            ->assertRedirect(route('admin.symptom_medicine_map.index'))
            ->assertSessionHas('success', 'Mapping updated.');

        $mapping->refresh();
        $this->assertSame(2, $mapping->priority);
        $this->assertSame('Updated private clinical note.', $mapping->note);

        $activity = Activity::forSubject($mapping)->where('event', 'updated')->latest()->firstOrFail();
        $this->assertSame([], $activity->attribute_changes?->all() ?? []);
        $this->assertStringContainsString('priority', $activity->description);
        $this->assertStringContainsString('note', $activity->description);
        $this->assertStringNotContainsString('Updated private clinical note.', json_encode($activity, JSON_THROW_ON_ERROR));
        $this->assertSame($actor->id, $activity->causer_id);
    }

    public function test_user_without_update_permission_cannot_open_or_update_mapping(): void
    {
        $mapping = $this->mapping(['priority' => 4]);
        $viewer = $this->userWithPermissions(['symptom_medicine_map.view']);

        $this->actingAs($viewer)
            ->get(route('admin.symptom_medicine_map.edit', $mapping))
            ->assertForbidden();

        $this->actingAs($viewer)
            ->put(route('admin.symptom_medicine_map.update', $mapping), $this->payload($mapping, ['priority' => 1]))
            ->assertForbidden();

        $this->assertSame(4, $mapping->fresh()->priority);
    }

    public function test_authorized_user_can_create_a_mapping_without_modifying_catalog_records(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create']);
        $symptom = $this->symptom();
        $medicine = $this->medicine();

        $this->actingAs($actor)
            ->post(route('admin.symptom_medicine_map.store'), [
                'symptom_id' => $symptom->id,
                'medicine_id' => $medicine->id,
                'priority' => 2,
                'note' => 'Use this mapping as a clinical reference.',
            ])
            ->assertRedirect(route('admin.symptom_medicine_map.index'))
            ->assertSessionHas('success', 'Mapping added.');

        $mapping = SymptomMedicineMap::query()->firstOrFail();
        $this->assertSame($symptom->id, $mapping->symptom_id);
        $this->assertSame($medicine->id, $mapping->medicine_id);
        $this->assertModelExists($symptom->fresh());
        $this->assertModelExists($medicine->fresh());
    }

    public function test_duplicate_create_and_update_attempts_are_rejected_without_changing_existing_mappings(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create', 'symptom_medicine_map.update']);
        $first = $this->mapping();
        $otherSymptom = $this->symptom('Cough');
        $second = $this->mapping(['symptom_id' => $otherSymptom->id, 'priority' => 4]);

        $this->actingAs($actor)
            ->post(route('admin.symptom_medicine_map.store'), [
                'symptom_id' => $first->symptom_id,
                'medicine_id' => $first->medicine_id,
                'priority' => 3,
            ])
            ->assertSessionHasErrors('medicine_id');

        $this->actingAs($actor)
            ->put(route('admin.symptom_medicine_map.update', $second), $this->payload($second, [
                'symptom_id' => $first->symptom_id,
                'medicine_id' => $first->medicine_id,
            ]))
            ->assertSessionHasErrors('medicine_id');

        $this->assertSame(2, SymptomMedicineMap::query()->count());
        $this->assertSame($otherSymptom->id, $second->fresh()->symptom_id);
    }

    public function test_existing_duplicate_pairs_can_be_edited_without_a_new_database_constraint(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.update']);
        $first = $this->mapping();
        $legacyDuplicate = $this->mapping([
            'symptom_id' => $first->symptom_id,
            'medicine_id' => $first->medicine_id,
            'priority' => 6,
        ]);

        $this->actingAs($actor)
            ->put(route('admin.symptom_medicine_map.update', $legacyDuplicate), $this->payload($legacyDuplicate, [
                'priority' => 3,
                'note' => 'Update existing legacy duplicate in place.',
            ]))
            ->assertRedirect(route('admin.symptom_medicine_map.index'));

        $this->assertSame(2, SymptomMedicineMap::query()->count());
        $this->assertSame(3, $legacyDuplicate->fresh()->priority);
        $this->assertSame(1, $first->fresh()->priority);
    }

    public function test_invalid_or_inactive_new_references_are_rejected(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create', 'symptom_medicine_map.update']);
        $mapping = $this->mapping();
        $inactiveSymptom = $this->symptom('Inactive symptom', false);
        $inactiveMedicine = $this->medicine('Inactive remedy', false);

        $this->actingAs($actor)
            ->post(route('admin.symptom_medicine_map.store'), [
                'symptom_id' => 999999,
                'medicine_id' => 999999,
                'priority' => 1,
            ])
            ->assertSessionHasErrors(['symptom_id', 'medicine_id']);

        $this->actingAs($actor)
            ->put(route('admin.symptom_medicine_map.update', $mapping), $this->payload($mapping, [
                'symptom_id' => $inactiveSymptom->id,
            ]))
            ->assertSessionHasErrors('symptom_id');

        $this->actingAs($actor)
            ->put(route('admin.symptom_medicine_map.update', $mapping), $this->payload($mapping, [
                'medicine_id' => $inactiveMedicine->id,
            ]))
            ->assertSessionHasErrors('medicine_id');

        $this->assertDatabaseCount('symptoms', 2);
        $this->assertDatabaseCount('medicines', 2);
        $this->assertSame('Headache', $mapping->fresh()->symptom->name_en);
        $this->assertSame('Arnica', $mapping->fresh()->medicine->name);
    }

    public function test_unchanged_inactive_catalog_references_can_be_kept_when_editing_other_mapping_fields(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.update']);
        $mapping = $this->mapping();
        $mapping->symptom()->update(['is_active' => false]);
        $mapping->medicine()->update(['is_active' => false]);

        $this->actingAs($actor)
            ->put(route('admin.symptom_medicine_map.update', $mapping), $this->payload($mapping, [
                'priority' => 2,
                'note' => 'Preserved while catalog references are inactive.',
            ]))
            ->assertRedirect(route('admin.symptom_medicine_map.index'));

        $this->assertSame(2, $mapping->fresh()->priority);
        $this->assertSame(false, (bool) $mapping->symptom->fresh()->is_active);
        $this->assertSame(false, (bool) $mapping->medicine->fresh()->is_active);
    }

    public function test_delete_soft_deletes_mapping_and_preserves_symptom_and_medicine_records(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.delete']);
        $mapping = $this->mapping();
        $symptom = $mapping->symptom;
        $medicine = $mapping->medicine;

        $this->actingAs($actor)
            ->delete(route('admin.symptom_medicine_map.destroy', $mapping))
            ->assertRedirect();

        $this->assertSoftDeleted('symptom_medicine_map', ['id' => $mapping->id]);
        $this->assertModelExists($symptom->fresh());
        $this->assertModelExists($medicine->fresh());
    }

    public function test_csv_import_preview_and_confirmation_restore_removed_mapping_as_unapproved_without_changing_creator(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create', 'symptom_medicine_map.view', 'visits.view']);
        $mapping = $this->mapping(['created_by' => $actor->id]);
        $mapping->delete();
        $csv = UploadedFile::fake()->createWithContent(
            'mappings.csv',
            "symptom_name,medicine_name,priority,note\nHeadache,Arnica,3,Imported clinical note\n",
        );

        $this->actingAs($actor)
            ->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $csv])
            ->assertRedirect()
            ->assertSessionHas('importPreviewToken');

        $token = session('importPreviewToken');
        $this->actingAs($actor)
            ->post(route('admin.symptom_medicine_map.import.confirm'), ['preview_token' => $token])
            ->assertRedirect(route('admin.symptom_medicine_map.index'))
            ->assertSessionHas('success', 'Import complete: 1 imported, 0 skipped, 0 rejected.');

        $this->assertSame(1, SymptomMedicineMap::query()->count());
        $this->assertNull($mapping->fresh()->deleted_at);
        $this->assertSame(3, $mapping->fresh()->priority);
        $this->assertSame('Imported clinical note', $mapping->fresh()->note);
        $this->assertFalse($mapping->fresh()->is_approved);
        $this->assertSame($actor->id, $mapping->fresh()->created_by);
        $this->assertSame($actor->id, $mapping->fresh()->updated_by);
        $this->assertDatabaseHas('symptoms', ['id' => $mapping->symptom_id]);
        $this->assertDatabaseHas('medicines', ['id' => $mapping->medicine_id]);
        $this->actingAs($actor)
            ->getJson(route('admin.visits.suggestions', ['symptoms' => [$mapping->symptom_id]]))
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_csv_preview_reports_valid_invalid_duplicate_and_protected_rows_without_writing(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create', 'symptom_medicine_map.view']);
        $approved = $this->mapping(['created_by' => $actor->id, 'priority' => 7, 'note' => 'Approved value']);
        $otherSymptom = $this->symptom('Cough');
        $csv = UploadedFile::fake()->createWithContent('mappings.csv', implode("\n", [
            'symptom_name,medicine_name,priority,note',
            'Headache,Arnica,2,"quoted, note"',
            'Headache,Arnica,3,duplicate row',
            'Missing symptom,Arnica,1,missing',
            'Cough,Arnica,0,bad priority',
        ]));

        $response = $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $csv]);
        $response->assertRedirect()->assertSessionHas('importPreviewToken');
        $this->get(route('admin.symptom_medicine_map.index'))->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->where('importPreview.totals.valid', 1)
            ->where('importPreview.totals.invalid', 2)
            ->where('importPreview.totals.duplicate', 1)
            ->where('importPreview.totals.new', 0)
            ->where('importPreview.totals.update', 1)
            ->where('importPreview.totals.protected', 1));

        $this->assertSame(1, SymptomMedicineMap::query()->count());
        $this->assertSame(7, $approved->fresh()->priority);
        $this->assertSame('Approved value', $approved->fresh()->note);
        $this->assertSame('Cough', $otherSymptom->fresh()->name_en);
    }

    public function test_confirm_import_skips_approved_mapping_and_reports_it_without_overwriting(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create']);
        $mapping = $this->mapping(['priority' => 8, 'note' => 'Approved clinical value']);
        $csv = UploadedFile::fake()->createWithContent('mappings.csv', "symptom_name,medicine_name,priority,note\nHeadache,Arnica,1,Changed\n");

        $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $csv]);
        $token = session('importPreviewToken');
        $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import.confirm'), ['preview_token' => $token])
            ->assertSessionHas('success', 'Import complete: 0 imported, 1 skipped, 0 rejected.');

        $this->assertSame(8, $mapping->fresh()->priority);
        $this->assertSame('Approved clinical value', $mapping->fresh()->note);
    }

    public function test_import_updates_only_unapproved_mappings_and_preserves_creator_with_audit_actor(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create']);
        $creator = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $mapping = $this->mapping(['created_by' => $creator->id, 'is_approved' => false, 'priority' => 8]);
        $csv = UploadedFile::fake()->createWithContent('mappings.csv', "symptom_name,medicine_name,priority,note\nHeadache,Arnica,2,Imported update\n");

        $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $csv]);
        $token = session('importPreviewToken');
        $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import.confirm'), ['preview_token' => $token])
            ->assertSessionHas('success', 'Import complete: 1 imported, 0 skipped, 0 rejected.');

        $mapping->refresh();
        $this->assertSame(2, $mapping->priority);
        $this->assertSame('Imported update', $mapping->note);
        $this->assertSame($creator->id, $mapping->created_by);
        $this->assertSame($actor->id, $mapping->updated_by);
        $this->assertFalse($mapping->is_approved);
        $activity = Activity::forSubject($mapping)->where('event', 'updated')->latest()->firstOrFail();
        $this->assertSame($actor->id, $activity->causer_id);
        $this->assertStringContainsString('priority', $activity->description);
    }

    public function test_csv_preview_marks_ambiguous_existing_database_duplicates_as_skipped(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create', 'symptom_medicine_map.view']);
        $first = $this->mapping(['priority' => 1]);
        $second = $this->mapping(['symptom_id' => $first->symptom_id, 'medicine_id' => $first->medicine_id, 'priority' => 4]);
        $csv = UploadedFile::fake()->createWithContent('mappings.csv', "symptom_name,medicine_name,priority,note\nHeadache,Arnica,2,Do not overwrite\n");

        $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $csv])
            ->assertSessionHas('importPreviewToken');
        $this->get(route('admin.symptom_medicine_map.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('importPreview.totals.duplicate', 1)
            ->where('importPreview.totals.valid', 0));

        $this->assertSame(1, $first->fresh()->priority);
        $this->assertSame(4, $second->fresh()->priority);
    }

    public function test_csv_import_rejects_wrong_headers_invalid_encoding_and_malformed_rows(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.create', 'symptom_medicine_map.view']);
        $badHeader = UploadedFile::fake()->createWithContent('bad.csv', "name,medicine\nHeadache,Arnica\n");
        $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $badHeader])
            ->assertSessionHasErrors('csv_file');

        $badEncoding = UploadedFile::fake()->createWithContent('encoding.csv', "symptom_name,medicine_name\n\xFF,Arnica\n");
        $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $badEncoding])
            ->assertSessionHasErrors('csv_file');

        $malformed = UploadedFile::fake()->createWithContent('malformed.csv', "symptom_name,medicine_name,priority,note\nHeadache,Arnica,2\n");
        $this->actingAs($actor)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $malformed])->assertSessionHas('importPreviewToken');
        $this->get(route('admin.symptom_medicine_map.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('importPreview.totals.invalid', 1));
        $this->assertSame(0, SymptomMedicineMap::query()->count());
    }

    public function test_import_preview_is_bound_to_the_user_and_permission_is_required(): void
    {
        $owner = $this->userWithPermissions(['symptom_medicine_map.create']);
        $other = $this->userWithPermissions(['symptom_medicine_map.create']);
        $csv = UploadedFile::fake()->createWithContent('mappings.csv', "symptom_name,medicine_name\nHeadache,Arnica\n");

        $this->actingAs($owner)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $csv]);
        $token = session('importPreviewToken');
        $this->actingAs($other)->post(route('admin.symptom_medicine_map.import.confirm'), ['preview_token' => $token])
            ->assertSessionHasErrors('preview_token');
        $this->assertSame(0, SymptomMedicineMap::query()->count());

        $viewer = $this->userWithPermissions(['symptom_medicine_map.view']);
        $this->actingAs($viewer)->post(route('admin.symptom_medicine_map.import'), ['csv_file' => $csv])->assertForbidden();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function mapping(array $overrides = []): SymptomMedicineMap
    {
        $symptomId = $overrides['symptom_id'] ?? $this->symptom()->id;
        $medicineId = $overrides['medicine_id'] ?? $this->medicine()->id;

        return SymptomMedicineMap::query()->create([
            'symptom_id' => $symptomId,
            'medicine_id' => $medicineId,
            'priority' => $overrides['priority'] ?? 1,
            'note' => $overrides['note'] ?? null,
            'created_by' => $overrides['created_by'] ?? null,
            'is_approved' => $overrides['is_approved'] ?? true,
        ]);
    }

    private function symptom(string $name = 'Headache', bool $isActive = true): Symptom
    {
        return Symptom::query()->create(['name_en' => $name, 'is_active' => $isActive]);
    }

    private function medicine(string $name = 'Arnica', bool $isActive = true): Medicine
    {
        return Medicine::query()->create([
            'name' => $name,
            'potency' => '30C',
            'form' => 'drops',
            'is_active' => $isActive,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(SymptomMedicineMap $mapping, array $overrides = []): array
    {
        return array_merge([
            'symptom_id' => $mapping->symptom_id,
            'medicine_id' => $mapping->medicine_id,
            'priority' => $mapping->priority,
            'note' => $mapping->note,
        ], $overrides);
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userWithPermissions(array $permissions): User
    {
        $permissions[] = 'clinical_records.view';

        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole('Doctor');
        $user->givePermissionTo($permissions);

        return $user;
    }
}
