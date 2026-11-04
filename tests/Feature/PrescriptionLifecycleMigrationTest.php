<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitAmendment;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PrescriptionLifecycleMigrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.url' => null,
        ]);
        DB::purge('sqlite');

        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));

        $this->artisan('migrate:fresh', ['--database' => 'sqlite', '--force' => true]);
    }

    protected function tearDown(): void
    {
        DB::disconnect('sqlite');
        DB::purge('sqlite');

        parent::tearDown();
    }

    public function test_fresh_install_keeps_new_visit_state_as_draft(): void
    {
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'status' => 'draft',
        ]);

        $this->assertSame('draft', $visit->fresh()->prescription_status);
        $this->assertTrue(Schema::hasColumns('prescription_items', [
            'prescription_version',
            'prescription_snapshot',
        ]));
    }

    public function test_legacy_backfill_preserves_item_data_soft_deleted_rows_and_amendments_as_unverified(): void
    {
        $patient = Patient::factory()->create();
        $user = User::factory()->create();
        $visit = Visit::factory()->finalized()->create([
            'patient_id' => $patient->id,
            'finalized_by' => $user->id,
            'finalized_at' => now()->subDay(),
        ]);
        $draftVisit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'status' => 'draft',
        ]);
        $firstMedicine = $this->medicine('Synthetic Medicine A');
        $secondMedicine = $this->medicine('Synthetic Medicine B');
        $activeItemId = $this->prescriptionItem($visit, $firstMedicine, ['timing' => ['morning', 'night']]);
        $deletedItemId = $this->prescriptionItem($visit, $secondMedicine, ['dose_qty' => '3.50']);
        DB::table('prescription_items')->where('id', $deletedItemId)->update(['deleted_at' => now()]);
        $amendment = VisitAmendment::create([
            'visit_id' => $visit->id,
            'amended_by' => $user->id,
            'reason' => 'Synthetic historical amendment.',
            'changed_fields' => ['prescription_items'],
        ]);

        $this->dropLifecycleColumns();

        $migration = $this->lifecycleMigration();
        $migration->up();

        $activeSnapshot = json_decode(DB::table('prescription_items')->where('id', $activeItemId)->value('prescription_snapshot'), true);
        $deletedSnapshot = json_decode(DB::table('prescription_items')->where('id', $deletedItemId)->value('prescription_snapshot'), true);

        $this->assertSame('legacy_unverified', $visit->fresh()->prescription_status);
        $this->assertSame('draft', $draftVisit->fresh()->prescription_status);
        $this->assertSame($firstMedicine->id, $activeSnapshot['medicine_id']);
        $this->assertNull($activeSnapshot['medicine_name']);
        $this->assertSame(['morning', 'night'], $activeSnapshot['directions']['timing']);
        $this->assertSame(2, (int) $activeSnapshot['directions']['dose_qty']);
        $this->assertSame('legacy_backfill', $activeSnapshot['provenance']['kind']);
        $this->assertSame('manual_review_required', $activeSnapshot['provenance']['status']);
        $this->assertSame('Synthetic Medicine B', $secondMedicine->fresh()->name);
        $this->assertSame($secondMedicine->id, $deletedSnapshot['medicine_id']);
        $this->assertNotNull($deletedSnapshot['source_record']['deleted_at']);
        $this->assertNull(DB::table('prescription_items')->where('id', $activeItemId)->value('prescription_version'));
        $this->assertSame($amendment->id, VisitAmendment::query()->firstOrFail()->id);
        $this->assertSame(['prescription_items'], $amendment->fresh()->changed_fields);
    }

    public function test_retries_preserve_existing_snapshot_versions_cancelled_state_and_permission_grants(): void
    {
        $patient = Patient::factory()->create();
        $user = User::factory()->create();
        $role = Role::create(['name' => 'Synthetic Prescription Reviewer', 'guard_name' => 'web']);
        $role->givePermissionTo('visits.cancel');
        $user->assignRole($role);
        $visit = Visit::factory()->finalized()->create([
            'patient_id' => $patient->id,
            'prescription_status' => 'cancelled',
            'cancelled_by' => $user->id,
            'cancelled_at' => now()->subHour(),
        ]);
        $medicine = $this->medicine();
        $snapshot = [
            'medicine_id' => $medicine->id,
            'medicine_name' => 'Synthetic historic name',
            'potency' => 'historic potency',
            'formulation' => 'historic formulation',
            'directions' => ['timing' => ['evening'], 'dose_qty' => 9],
            'provenance' => ['kind' => 'historic-source', 'status' => 'manual_review_required'],
        ];
        $itemId = $this->prescriptionItem($visit, $medicine, [
            'prescription_version' => 4,
            'prescription_snapshot' => $snapshot,
        ]);
        $pendingItemId = $this->prescriptionItem($visit, $medicine, ['sort_order' => 1]);
        $amendment = VisitAmendment::create([
            'visit_id' => $visit->id,
            'amended_by' => $user->id,
            'reason' => 'Synthetic recorded cancellation.',
            'changed_fields' => ['prescription_status'],
        ]);
        $auditId = DB::table('activity_log')->insertGetId([
            'description' => 'Synthetic prescription audit marker.',
            'subject_type' => Visit::class,
            'subject_id' => $visit->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $migration = $this->lifecycleMigration();
        $migration->up();
        $migration->up();

        $savedSnapshot = json_decode(DB::table('prescription_items')->where('id', $itemId)->value('prescription_snapshot'), true);
        $resumedSnapshot = json_decode(DB::table('prescription_items')->where('id', $pendingItemId)->value('prescription_snapshot'), true);
        $savedVisit = $visit->fresh();

        $this->assertSame($snapshot, $savedSnapshot);
        $this->assertSame('manual_review_required', $resumedSnapshot['provenance']['status']);
        $this->assertSame(4, (int) DB::table('prescription_items')->where('id', $itemId)->value('prescription_version'));
        $this->assertSame('cancelled', $savedVisit->prescription_status);
        $this->assertSame($user->id, $savedVisit->cancelled_by);
        $this->assertNotNull($savedVisit->cancelled_at);
        $this->assertSame($amendment->id, VisitAmendment::query()->firstOrFail()->id);
        $this->assertTrue($user->can('visits.cancel'));
        $this->assertDatabaseHas('activity_log', ['id' => $auditId, 'subject_id' => $visit->id]);
        $this->assertDatabaseCount('prescription_items', 2);
        $this->assertDatabaseCount('visit_amendments', 1);
    }

    public function test_invalid_timing_is_preserved_raw_and_forward_verifier_identifies_the_record(): void
    {
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id, 'status' => 'draft']);
        $medicine = $this->medicine();
        $itemId = $this->prescriptionItem($visit, $medicine);
        DB::table('prescription_items')->where('id', $itemId)->update(['timing' => 'not-json']);

        $this->lifecycleMigration()->up();

        $snapshot = json_decode(DB::table('prescription_items')->where('id', $itemId)->value('prescription_snapshot'), true);
        $this->assertNull($snapshot['directions']['timing']);
        $this->assertSame('not-json', $snapshot['directions']['timing_source_raw']);
        $this->assertContains('timing_json_invalid', $snapshot['provenance']['reasons']);

        $this->artisan('prescriptions:verify-history', ['--limit' => 10])
            ->expectsOutputToContain('invalid_timing_json: 1 record(s)')
            ->expectsOutputToContain("IDs: {$itemId}")
            ->assertExitCode(1);
    }

    public function test_missing_medicine_catalog_reference_is_marked_for_manual_review(): void
    {
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id, 'status' => 'draft']);
        $medicine = $this->medicine();
        $itemId = $this->prescriptionItem($visit, $medicine);

        Schema::disableForeignKeyConstraints();
        DB::table('medicines')->where('id', $medicine->id)->delete();
        Schema::enableForeignKeyConstraints();

        $this->lifecycleMigration()->up();

        $snapshot = json_decode(DB::table('prescription_items')->where('id', $itemId)->value('prescription_snapshot'), true);
        $this->assertSame($medicine->id, $snapshot['medicine_id']);
        $this->assertNull($snapshot['medicine_name']);
        $this->assertContains('medicine_catalog_record_unavailable', $snapshot['provenance']['reasons']);
    }

    public function test_forward_verifier_reports_legacy_uncertainty_without_modifying_records(): void
    {
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'status' => 'finalized',
            'prescription_status' => 'legacy_unverified',
        ]);
        $medicine = $this->medicine();
        $itemId = $this->prescriptionItem($visit, $medicine, [
            'prescription_snapshot' => [
                'medicine_id' => $medicine->id,
                'medicine_name' => null,
                'directions' => ['timing' => ['morning']],
                'provenance' => [
                    'kind' => 'legacy_backfill',
                    'status' => 'manual_review_required',
                    'reasons' => ['point_in_time_medicine_details_not_recorded'],
                ],
            ],
        ]);
        $beforeSnapshot = DB::table('prescription_items')->where('id', $itemId)->value('prescription_snapshot');
        $beforeState = $visit->prescription_status;

        $this->artisan('prescriptions:verify-history', ['--limit' => 10])
            ->expectsOutputToContain('Read-only prescription history verification completed.')
            ->expectsOutputToContain('snapshot_requires_manual_review: 1 record(s)')
            ->expectsOutputToContain('lifecycle_state_unverified: 1 record(s)')
            ->assertSuccessful();

        $this->assertSame($beforeSnapshot, DB::table('prescription_items')->where('id', $itemId)->value('prescription_snapshot'));
        $this->assertSame($beforeState, $visit->fresh()->prescription_status);
    }

    public function test_rollback_is_refused_without_removing_permission_grants_or_clinical_history(): void
    {
        $patient = Patient::factory()->create();
        $user = User::factory()->create();
        $role = Role::create(['name' => 'Synthetic Rollback Reviewer', 'guard_name' => 'web']);
        $role->givePermissionTo('visits.cancel');
        $user->assignRole($role);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'status' => 'finalized',
            'prescription_status' => 'cancelled',
            'cancelled_by' => $user->id,
            'cancelled_at' => now(),
        ]);
        $amendment = VisitAmendment::create([
            'visit_id' => $visit->id,
            'amended_by' => $user->id,
            'reason' => 'Synthetic protected audit history.',
            'changed_fields' => ['prescription_status'],
        ]);
        $snapshot = ['provenance' => ['status' => 'manual_review_required']];
        $itemId = $this->prescriptionItem($visit, $this->medicine(), ['prescription_snapshot' => $snapshot]);

        try {
            $this->lifecycleMigration()->down();
            $this->fail('The lifecycle migration must refuse destructive rollback.');
        } catch (RuntimeException) {
            $this->assertDatabaseHas('prescription_items', [
                'id' => $itemId,
                'prescription_snapshot' => json_encode($snapshot),
            ]);
            $this->assertDatabaseHas('visit_amendments', ['id' => $amendment->id]);
            $this->assertTrue($user->fresh()->can('visits.cancel'));
            $this->assertSame('cancelled', $visit->fresh()->prescription_status);
        }
    }

    public function test_clinical_governance_and_permission_migrations_fail_closed_on_rollback(): void
    {
        $finalizePermission = Permission::findByName('visits.finalize', 'web');
        $reviewPermission = Permission::findByName('symptom_medicine_map.review', 'web');
        $role = Role::create(['name' => 'Synthetic Protected Grants', 'guard_name' => 'web']);
        $role->givePermissionTo([$finalizePermission, $reviewPermission]);

        $forwardOnlyMigrations = [
            '2026_11_03_175933_add_visit_finalization_and_doctor_account_fields.php',
            '2026_11_03_175934_create_visit_amendments_table.php',
            '2026_11_03_175935_add_visits_finalize_permission.php',
            '2026_11_03_182448_add_soft_deletes_to_symptom_medicine_map_table.php',
            '2026_11_03_183030_add_approval_status_to_symptom_medicine_map_table.php',
            '2026_11_03_183911_add_symptom_map_review_workflow_fields.php',
            '2026_11_03_183912_create_symptom_medicine_map_versions_table.php',
            '2026_11_03_183913_add_symptom_medicine_map_review_permission.php',
            '2026_11_03_191751_add_batch_uuid_to_activity_log_table.php',
            '2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php',
        ];

        foreach ($forwardOnlyMigrations as $migrationFile) {
            $migration = require database_path('migrations/'.$migrationFile);

            try {
                $migration->down();
                $this->fail("{$migrationFile} must refuse destructive rollback.");
            } catch (RuntimeException $exception) {
                $this->assertNotSame('', $exception->getMessage());
            }
        }

        $this->assertTrue($role->fresh()->hasPermissionTo($finalizePermission));
        $this->assertTrue($role->fresh()->hasPermissionTo($reviewPermission));
        $this->assertTrue(Schema::hasColumns('visits', ['finalized_by', 'finalized_at', 'prescription_status']));
        $this->assertTrue(Schema::hasTable('visit_amendments'));
        $this->assertTrue(Schema::hasColumns('symptom_medicine_map', [
            'deleted_at', 'is_approved', 'review_status', 'reviewed_by', 'reviewed_at',
        ]));
        $this->assertTrue(Schema::hasTable('symptom_medicine_map_versions'));
        $this->assertTrue(Schema::hasColumn('activity_log', 'batch_uuid'));
    }

    public function test_symptom_map_version_backfill_resumes_without_duplicating_or_overwriting_versions(): void
    {
        $symptomId = DB::table('symptoms')->insertGetId([
            'name_en' => 'Synthetic symptom for migration retry',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $medicine = $this->medicine('Synthetic repertory medicine');
        $firstMappingId = $this->approvedMapping($symptomId, $medicine->id);
        $migration = require database_path('migrations/2026_11_03_183912_create_symptom_medicine_map_versions_table.php');

        $migration->up();

        $version = DB::table('symptom_medicine_map_versions')
            ->where('symptom_medicine_map_id', $firstMappingId)
            ->where('version_number', 1)
            ->first();
        $originalSnapshot = json_decode($version->snapshot, true);
        $this->assertSame('legacy_unreviewed', $originalSnapshot['review_status']);
        $this->assertSame('manual_review_required', $originalSnapshot['provenance']['status']);
        $this->assertNull($originalSnapshot['reviewed_by']);
        $this->assertNull($originalSnapshot['reviewed_at']);

        DB::table('symptom_medicine_map_versions')->where('id', $version->id)->update([
            'snapshot' => json_encode(['independently_verified' => 'preserve this snapshot']),
        ]);
        $secondMappingId = $this->approvedMapping($symptomId, $medicine->id, 2);

        $migration->up();

        $this->assertDatabaseCount('symptom_medicine_map_versions', 2);
        $this->assertSame(
            ['independently_verified' => 'preserve this snapshot'],
            json_decode(DB::table('symptom_medicine_map_versions')->where('id', $version->id)->value('snapshot'), true)
        );
        $this->assertDatabaseHas('symptom_medicine_map_versions', [
            'symptom_medicine_map_id' => $secondMappingId,
            'version_number' => 1,
        ]);
    }

    public function test_clinical_and_audit_schema_migrations_resume_after_missing_columns(): void
    {
        Schema::table('visits', function (Blueprint $table): void {
            $table->dropColumn('finalized_at');
        });
        Schema::table('symptom_medicine_map', function (Blueprint $table): void {
            $table->dropColumn(['deleted_at', 'is_approved', 'reviewer_name']);
        });
        Schema::table('activity_log', function (Blueprint $table): void {
            $table->dropIndex(['batch_uuid']);
            $table->dropColumn('batch_uuid');
        });

        (require database_path('migrations/2026_11_03_175933_add_visit_finalization_and_doctor_account_fields.php'))->up();
        (require database_path('migrations/2026_11_03_182448_add_soft_deletes_to_symptom_medicine_map_table.php'))->up();
        (require database_path('migrations/2026_11_03_183030_add_approval_status_to_symptom_medicine_map_table.php'))->up();
        (require database_path('migrations/2026_11_03_183911_add_symptom_map_review_workflow_fields.php'))->up();
        (require database_path('migrations/2026_11_03_191751_add_batch_uuid_to_activity_log_table.php'))->up();

        $this->assertTrue(Schema::hasColumn('visits', 'finalized_at'));
        $this->assertTrue(Schema::hasColumns('symptom_medicine_map', [
            'deleted_at', 'is_approved', 'reviewer_name', 'review_status', 'reviewed_by', 'reviewed_at',
        ]));
        $this->assertTrue(Schema::hasColumn('activity_log', 'batch_uuid'));
        $this->assertTrue(collect(Schema::getIndexes('activity_log'))
            ->contains(fn (array $index): bool => $index['columns'] === ['batch_uuid']));
    }

    public function test_cancellation_permission_migration_invalidates_spatie_permission_cache(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();
        $this->assertTrue($registrar->getPermissions()->contains('name', 'visits.cancel'));

        DB::table('permissions')
            ->where('name', 'visits.cancel')
            ->where('guard_name', 'web')
            ->delete();
        $registrar->forgetCachedPermissions();
        $this->assertFalse($registrar->getPermissions()->contains('name', 'visits.cancel'));

        $this->lifecycleMigration()->up();

        $this->assertTrue($registrar->getPermissions()->contains('name', 'visits.cancel'));
        $this->assertSame(1, DB::table('permissions')
            ->where('name', 'visits.cancel')
            ->where('guard_name', 'web')
            ->count());
    }

    private function lifecycleMigration(): Migration
    {
        return require database_path('migrations/2026_11_03_180952_add_prescription_lifecycle_and_snapshot_fields.php');
    }

    private function dropLifecycleColumns(): void
    {
        $hasCancellationForeignKey = Schema::hasForeignKey('visits', ['cancelled_by']);

        Schema::table('visits', function (Blueprint $table) use ($hasCancellationForeignKey): void {
            if ($hasCancellationForeignKey) {
                $table->dropForeign(['cancelled_by']);
            }

            $table->dropColumn([
                'prescription_status',
                'cancelled_by',
                'cancelled_at',
                'prescriber_snapshot',
                'prescription_authorizer_snapshot',
                'patient_snapshot',
            ]);
        });

        Schema::table('prescription_items', function (Blueprint $table): void {
            $table->dropColumn(['prescription_version', 'prescription_snapshot']);
        });
    }

    private function medicine(string $name = 'Synthetic Medicine'): Medicine
    {
        return Medicine::query()->create([
            'name' => $name,
            'potency' => 'synthetic potency',
            'form' => 'drops',
            'default_instruction' => 'synthetic catalog instruction',
            'is_active' => true,
        ]);
    }

    private function approvedMapping(int $symptomId, int $medicineId, int $priority = 1): int
    {
        return (int) DB::table('symptom_medicine_map')->insertGetId([
            'symptom_id' => $symptomId,
            'medicine_id' => $medicineId,
            'priority' => $priority,
            'note' => 'Synthetic legacy map note.',
            'is_approved' => true,
            'review_status' => 'approved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function prescriptionItem(Visit $visit, Medicine $medicine, array $attributes = []): int
    {
        $attributes = array_merge([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'sort_order' => 0,
            'timing' => json_encode(['morning']),
            'before_after' => 'after',
            'dose_qty' => '2.00',
            'dose_unit' => 'drops',
            'dilution_note' => 'stored source instruction',
            'duration_days' => 5,
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDay(),
        ], $attributes);

        if (isset($attributes['prescription_snapshot']) && is_array($attributes['prescription_snapshot'])) {
            $attributes['prescription_snapshot'] = json_encode($attributes['prescription_snapshot']);
        }

        if (isset($attributes['timing']) && is_array($attributes['timing'])) {
            $attributes['timing'] = json_encode($attributes['timing']);
        }

        return (int) DB::table('prescription_items')->insertGetId($attributes);
    }
}
