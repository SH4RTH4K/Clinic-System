<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\Symptom;
use App\Models\SymptomMedicineMap;
use App\Models\SymptomMedicineMapVersion;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SymptomMedicineMapGovernanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();

        foreach ([
            'symptom_medicine_map.view',
            'symptom_medicine_map.create',
            'symptom_medicine_map.update',
            'symptom_medicine_map.delete',
            'symptom_medicine_map.review',
            'visits.view',
            'clinical_records.view',
        ] as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
        Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    }

    public function test_new_reference_is_a_draft_and_does_not_create_or_authorize_a_prescription(): void
    {
        $editor = $this->userWithPermissions(['symptom_medicine_map.create', 'visits.view']);
        $symptom = $this->symptom();
        $medicine = $this->medicine();

        $this->actingAs($editor)->post(route('admin.symptom_medicine_map.store'), [
            'symptom_id' => $symptom->id,
            'medicine_id' => $medicine->id,
            'priority' => 1,
            'note' => 'General repertory reference only.',
            'source_title' => 'Example Repertory',
            'source_author' => 'Reference editor',
            'source_edition' => 'Second edition',
            'source_page' => '12',
        ])->assertRedirect();

        $mapping = SymptomMedicineMap::query()->firstOrFail();
        $this->assertSame('draft', $mapping->review_status);
        $this->assertFalse($mapping->is_approved);
        $this->assertSame('Example Repertory', $mapping->source_title);
        $this->actingAs($editor)->getJson(route('admin.visits.suggestions', ['symptoms' => [$symptom->id]]))->assertOk()->assertExactJson([]);
        $this->assertDatabaseCount('visits', 0);
        $this->assertDatabaseCount('prescription_items', 0);
    }

    public function test_reviewer_approval_requires_explicit_submission_and_records_identity_and_time(): void
    {
        $editor = $this->userWithPermissions(['symptom_medicine_map.update', 'visits.view']);
        $reviewer = $this->userWithPermissions(['symptom_medicine_map.review', 'visits.view']);
        $mapping = $this->mapping(['source_title' => 'Clinical repertory']);

        $this->actingAs($reviewer)->get(route('admin.symptom_medicine_map.edit', $mapping))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/SymptomMedicineMap/Edit'));

        $this->actingAs($editor)->post(route('admin.symptom_medicine_map.submit_review', $mapping), ['confirmed' => true])
            ->assertRedirect()->assertSessionHas('success');
        $this->assertSame('pending_review', $mapping->fresh()->review_status);

        $this->actingAs($reviewer)->post(route('admin.symptom_medicine_map.review', $mapping), [
            'decision' => 'approved',
            'review_acknowledged' => true,
        ])->assertRedirect();

        $mapping->refresh();
        $this->assertSame('approved', $mapping->review_status);
        $this->assertTrue($mapping->is_approved);
        $this->assertSame($reviewer->id, $mapping->reviewed_by);
        $this->assertSame($reviewer->name, $mapping->reviewer_name);
        $this->assertNotNull($mapping->reviewed_at);
        $this->actingAs($reviewer)->getJson(route('admin.visits.suggestions', ['symptoms' => [$mapping->symptom_id]]))
            ->assertOk()
            ->assertJsonPath('0.medicine_id', $mapping->medicine_id)
            ->assertJsonPath('0.reference_match_count', 1);
        $this->assertDatabaseCount('visits', 0);
        $this->assertDatabaseCount('prescription_items', 0);
    }

    public function test_legacy_approval_correction_removes_unverified_approval_without_inventing_review_details(): void
    {
        $reviewer = $this->userWithPermissions(['symptom_medicine_map.review', 'visits.view']);
        $legacy = $this->mapping([
            'review_status' => 'approved',
            'is_approved' => true,
            'source_title' => null,
            'reviewed_by' => null,
            'reviewer_name' => null,
            'reviewed_at' => null,
        ]);
        $verified = $this->mapping([
            'review_status' => 'approved',
            'is_approved' => true,
            'source_title' => 'Documented repertory source',
            'reviewed_by' => $reviewer->id,
            'reviewer_name' => $reviewer->name,
            'reviewed_at' => now(),
        ]);
        $legacyVersion = SymptomMedicineMapVersion::query()->create([
            'symptom_medicine_map_id' => $legacy->id,
            'version_number' => 1,
            'snapshot' => [
                'symptom_id' => $legacy->symptom_id,
                'medicine_id' => $legacy->medicine_id,
                'review_status' => 'approved',
                'reviewed_by' => null,
                'reviewer_name' => null,
                'reviewed_at' => null,
                'source_title' => null,
            ],
            'archived_at' => now(),
        ]);

        $migration = require database_path('migrations/2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php');
        $migration->up();

        $legacy->refresh();
        $verified->refresh();
        $legacyVersion->refresh();

        $this->assertSame('legacy_unreviewed', $legacy->review_status);
        $this->assertFalse($legacy->is_approved);
        $this->assertNull($legacy->reviewed_by);
        $this->assertNull($legacy->reviewer_name);
        $this->assertNull($legacy->reviewed_at);
        $this->assertSame('approved', $verified->review_status);
        $this->assertTrue($verified->is_approved);
        $this->assertSame('legacy_unreviewed', $legacyVersion->snapshot['review_status']);
        $this->assertFalse($legacyVersion->snapshot['is_approved']);
        $this->assertNull($legacyVersion->snapshot['reviewer_name']);
        $this->assertSame($legacy->id, $legacyVersion->symptom_medicine_map_id);
        $this->assertDatabaseHas('symptom_medicine_map', ['id' => $legacy->id]);
        $this->actingAs($reviewer)
            ->getJson(route('admin.visits.suggestions', ['symptoms' => [$legacy->symptom_id]]))
            ->assertOk()
            ->assertExactJson([]);
        $this->actingAs($reviewer)
            ->post(route('admin.symptom_medicine_map.review', $legacy), [
                'decision' => 'approved',
                'review_acknowledged' => true,
            ])
            ->assertStatus(422);
    }

    public function test_review_cannot_approve_a_reference_without_a_source_title(): void
    {
        $reviewer = $this->userWithPermissions(['symptom_medicine_map.review']);
        $mapping = $this->mapping(['review_status' => 'pending_review', 'is_approved' => false, 'source_title' => null]);

        $this->actingAs($reviewer)->post(route('admin.symptom_medicine_map.review', $mapping), [
            'decision' => 'approved',
            'review_acknowledged' => true,
        ])->assertStatus(422);

        $this->assertSame('pending_review', $mapping->fresh()->review_status);
        $this->assertNull($mapping->fresh()->reviewed_by);
    }

    public function test_reviewer_decision_identity_and_timestamp_are_archived_when_mapping_is_resubmitted(): void
    {
        $editor = $this->userWithPermissions(['symptom_medicine_map.update']);
        $reviewer = $this->userWithPermissions(['symptom_medicine_map.review']);
        $mapping = $this->mapping([
            'review_status' => 'pending_review',
            'is_approved' => false,
            'source_title' => 'Cited repertory source',
        ]);

        $this->actingAs($reviewer)
            ->post(route('admin.symptom_medicine_map.review', $mapping), [
                'decision' => 'rejected',
                'review_note' => 'Citation details need clarification.',
            ])
            ->assertRedirect();

        $rejectedMapping = $mapping->fresh();
        $reviewedAt = $rejectedMapping->reviewed_at->toIso8601String();

        $this->actingAs($editor)
            ->post(route('admin.symptom_medicine_map.submit_review', $mapping), ['confirmed' => true])
            ->assertRedirect();

        $version = SymptomMedicineMapVersion::query()
            ->where('symptom_medicine_map_id', $mapping->id)
            ->orderByDesc('version_number')
            ->firstOrFail();

        $this->assertSame('pending_review', $mapping->fresh()->review_status);
        $this->assertNull($mapping->fresh()->reviewed_by);
        $this->assertSame('rejected', $version->snapshot['review_status']);
        $this->assertSame($reviewer->id, $version->snapshot['reviewed_by']);
        $this->assertSame($reviewer->name, $version->snapshot['reviewer_name']);
        $this->assertSame($reviewedAt, $version->snapshot['reviewed_at']);
        $this->assertSame('Citation details need clarification.', $version->snapshot['review_note']);
        $this->assertSame($editor->id, $version->archived_by);
    }

    public function test_user_without_review_permission_cannot_publish_a_pending_reference(): void
    {
        $editor = $this->userWithPermissions(['symptom_medicine_map.update']);
        $mapping = $this->mapping(['review_status' => 'pending_review', 'is_approved' => false]);

        $this->actingAs($editor)->post(route('admin.symptom_medicine_map.review', $mapping), [
            'decision' => 'approved',
            'review_acknowledged' => true,
        ])->assertForbidden();

        $this->assertSame('pending_review', $mapping->fresh()->review_status);
        $this->assertFalse($mapping->fresh()->is_approved);
    }

    public function test_super_admin_without_qualified_review_permission_cannot_publish_pending_reference(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');
        $mapping = $this->mapping(['review_status' => 'pending_review', 'is_approved' => false]);

        $this->actingAs($superAdmin)->post(route('admin.symptom_medicine_map.review', $mapping), [
            'decision' => 'approved',
            'review_acknowledged' => true,
        ])->assertForbidden();

        $this->assertSame('pending_review', $mapping->fresh()->review_status);
    }

    public function test_editing_an_approved_reference_archives_its_approved_version_and_returns_it_to_draft(): void
    {
        $editor = $this->userWithPermissions(['symptom_medicine_map.update', 'visits.view']);
        $mapping = $this->mapping([
            'review_status' => 'approved',
            'is_approved' => true,
            'priority' => 3,
            'note' => 'Previously approved text',
            'source_title' => 'Source A',
            'reviewed_by' => $editor->id,
            'reviewed_at' => now(),
        ]);

        $this->actingAs($editor)->put(route('admin.symptom_medicine_map.update', $mapping), [
            'symptom_id' => $mapping->symptom_id,
            'medicine_id' => $mapping->medicine_id,
            'priority' => 2,
            'note' => 'Revised text requiring review',
            'source_title' => 'Source B',
        ])->assertRedirect();

        $mapping->refresh();
        $this->assertSame('draft', $mapping->review_status);
        $this->assertFalse($mapping->is_approved);
        $this->assertNull($mapping->reviewed_by);
        $version = SymptomMedicineMapVersion::query()->where('symptom_medicine_map_id', $mapping->id)->firstOrFail();
        $this->assertSame(3, $version->snapshot['priority']);
        $this->assertSame('Previously approved text', $version->snapshot['note']);
        $this->assertSame('Source A', $version->snapshot['source_title']);
        $this->assertSame($editor->id, $version->archived_by);

        $this->actingAs($editor)->getJson(route('admin.visits.suggestions', ['symptoms' => [$mapping->symptom_id]]))
            ->assertOk()->assertExactJson([]);
    }

    public function test_suggestion_endpoint_rejects_invalid_inactive_duplicate_and_excessive_symptom_input(): void
    {
        $viewer = $this->userWithPermissions(['visits.view']);
        $symptom = $this->symptom();
        $inactiveSymptom = $this->symptom('Inactive symptom', false);

        $this->actingAs($viewer)->getJson(route('admin.visits.suggestions'))->assertOk()->assertExactJson([]);
        $this->actingAs($viewer)->getJson(route('admin.visits.suggestions', ['symptoms' => [999999]]))->assertUnprocessable();
        $this->actingAs($viewer)->getJson(route('admin.visits.suggestions', ['symptoms' => [$inactiveSymptom->id]]))->assertUnprocessable();
        $this->actingAs($viewer)->getJson(route('admin.visits.suggestions', ['symptoms' => [$symptom->id, $symptom->id]]))->assertUnprocessable();
        $this->actingAs($viewer)->getJson(route('admin.visits.suggestions', ['symptoms' => range(1, 11)]))->assertUnprocessable();
    }

    public function test_approved_mapping_is_not_suggested_when_its_medicine_becomes_inactive(): void
    {
        $viewer = $this->userWithPermissions(['visits.view']);
        $mapping = $this->mapping(['review_status' => 'approved', 'is_approved' => true]);
        $mapping->medicine()->update(['is_active' => false]);

        $this->actingAs($viewer)->getJson(route('admin.visits.suggestions', ['symptoms' => [$mapping->symptom_id]]))
            ->assertOk()->assertExactJson([]);
    }

    public function test_deactivating_a_mapping_preserves_its_previous_state_and_catalog_relationships(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.delete']);
        $mapping = $this->mapping(['note' => 'Keep this historical reference detail.']);
        $symptom = $mapping->symptom;
        $medicine = $mapping->medicine;

        $this->actingAs($actor)
            ->delete(route('admin.symptom_medicine_map.destroy', $mapping))
            ->assertRedirect();

        $mapping->refresh();
        $version = SymptomMedicineMapVersion::query()
            ->where('symptom_medicine_map_id', $mapping->id)
            ->firstOrFail();

        $this->assertSoftDeleted('symptom_medicine_map', ['id' => $mapping->id]);
        $this->assertSame('inactive', $mapping->review_status);
        $this->assertSame('draft', $version->snapshot['review_status']);
        $this->assertSame($symptom->id, $version->snapshot['symptom_id']);
        $this->assertSame($medicine->id, $version->snapshot['medicine_id']);
        $this->assertSame('Keep this historical reference detail.', $version->snapshot['note']);
        $this->assertModelExists($symptom->fresh());
        $this->assertModelExists($medicine->fresh());
        $activity = Activity::forSubject($mapping)->where('event', 'deleted')->latest()->firstOrFail();
        $this->assertSame($actor->id, $activity->causer_id);
    }

    public function test_mapping_with_version_history_cannot_be_hard_deleted(): void
    {
        $actor = $this->userWithPermissions(['symptom_medicine_map.update']);
        $mapping = $this->mapping();
        $mapping->preserveVersion($actor->id);

        try {
            $mapping->forceDelete();
            self::fail('A mapping with retained history must not be hard-deleted.');
        } catch (QueryException) {
            $this->assertModelExists($mapping->fresh());
            $this->assertDatabaseHas('symptom_medicine_map_versions', [
                'symptom_medicine_map_id' => $mapping->id,
                'version_number' => 1,
            ]);
        }
    }

    public function test_soft_deleted_mapping_requires_update_permission_to_restore_and_returns_pending_review(): void
    {
        $reviewer = $this->userWithPermissions(['symptom_medicine_map.review']);
        $mapping = $this->mapping([
            'review_status' => 'approved',
            'is_approved' => true,
            'source_title' => 'Documented source',
            'reviewed_by' => $reviewer->id,
            'reviewer_name' => $reviewer->name,
            'reviewed_at' => now(),
        ]);
        $mappingId = $mapping->id;
        $mapping->delete();
        $unauthorized = $this->userWithPermissions(['visits.view']);
        $editor = $this->userWithPermissions(['symptom_medicine_map.update', 'visits.view']);

        $this->actingAs($unauthorized)
            ->post(route('admin.symptom_medicine_map.restore', $mappingId), ['confirmed' => true])
            ->assertForbidden();

        $this->actingAs($editor)
            ->post(route('admin.symptom_medicine_map.restore', $mappingId), ['confirmed' => true])
            ->assertRedirect();

        $mapping->refresh();
        $version = SymptomMedicineMapVersion::query()
            ->where('symptom_medicine_map_id', $mappingId)
            ->orderByDesc('version_number')
            ->firstOrFail();

        $this->assertNull($mapping->deleted_at);
        $this->assertSame('pending_review', $mapping->review_status);
        $this->assertFalse($mapping->is_approved);
        $this->assertNull($mapping->reviewed_by);
        $this->assertNull($mapping->reviewer_name);
        $this->assertNull($mapping->reviewed_at);
        $this->assertSame('approved', $version->snapshot['review_status']);
        $this->assertSame($reviewer->id, $version->snapshot['reviewed_by']);
        $this->assertSame($reviewer->name, $version->snapshot['reviewer_name']);

        $this->actingAs($editor)
            ->getJson(route('admin.visits.suggestions', ['symptoms' => [$mapping->symptom_id]]))
            ->assertOk()
            ->assertExactJson([]);
    }

    /** @param array<string, mixed> $overrides */
    private function mapping(array $overrides = []): SymptomMedicineMap
    {
        return SymptomMedicineMap::query()->create(array_merge([
            'symptom_id' => $this->symptom()->id,
            'medicine_id' => $this->medicine()->id,
            'priority' => 1,
            'note' => null,
            'created_by' => null,
            'review_status' => 'draft',
            'is_approved' => false,
        ], $overrides));
    }

    private function symptom(string $name = 'Headache', bool $active = true): Symptom
    {
        return Symptom::query()->create(['name_en' => $name, 'is_active' => $active]);
    }

    private function medicine(string $name = 'Arnica', bool $active = true): Medicine
    {
        return Medicine::query()->create(['name' => $name, 'potency' => '30C', 'form' => 'drops', 'is_active' => $active]);
    }

    /** @param array<int, string> $permissions */
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
