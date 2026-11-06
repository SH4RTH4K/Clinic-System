<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class ClinicalRetentionMigrationTest extends TestCase
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
        $this->artisan('migrate:fresh', ['--database' => 'sqlite', '--force' => true])->assertExitCode(0);
    }

    public function test_visit_draft_migration_is_retryable_and_preserves_existing_draft_records(): void
    {
        $user = User::factory()->create();
        DB::table('visit_drafts')->insert([
            'user_id' => $user->id,
            'payload' => 'synthetic-encrypted-draft-payload',
            'expires_at' => now()->addDay(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $migration = $this->migration('2026_11_03_173145_create_visit_drafts_table.php');
        $migration->up();
        $migration->up();

        $this->assertTrue(Schema::hasColumns('visit_drafts', [
            'id', 'user_id', 'payload', 'expires_at', 'created_at', 'updated_at',
        ]));
        $this->assertSame('synthetic-encrypted-draft-payload', DB::table('visit_drafts')->where('user_id', $user->id)->value('payload'));
        $this->assertTrue(Schema::hasIndex('visit_drafts', ['user_id'], 'unique'));
        $this->assertTrue(Schema::hasIndex('visit_drafts', ['expires_at']));
        $this->assertForeignKey('visit_drafts', 'user_id', 'users', 'cascade');
    }

    public function test_visit_draft_migration_rejects_an_incomplete_existing_table_without_recreating_it(): void
    {
        Schema::table('visit_drafts', function (Blueprint $table): void {
            $table->dropColumn('payload');
        });

        try {
            $this->migration('2026_11_03_173145_create_visit_drafts_table.php')->up();
            $this->fail('Expected the incomplete visit_drafts table to be rejected.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('incompatible column layout', $exception->getMessage());
        }

        $this->assertTrue(Schema::hasTable('visit_drafts'));
        $this->assertFalse(Schema::hasColumn('visit_drafts', 'payload'));
    }

    public function test_history_schema_checks_accept_explicit_null_timestamp_defaults(): void
    {
        foreach ([
            'visit_drafts' => '2026_11_03_173145_create_visit_drafts_table.php',
            'visit_amendments' => '2026_11_03_175934_create_visit_amendments_table.php',
        ] as $tableName => $migrationFile) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->timestamp('created_at')->nullable()->default(DB::raw('NULL'))->change();
                $table->timestamp('updated_at')->nullable()->default(DB::raw('NULL'))->change();
            });
            $columnsBefore = Schema::getColumns($tableName);
            $this->assertSame('NULL', collect($columnsBefore)->firstWhere('name', 'created_at')['default']);

            $this->migration($migrationFile)->up();

            $this->assertSame($columnsBefore, Schema::getColumns($tableName));
        }
    }

    public function test_history_schema_checks_reject_non_null_timestamp_defaults_without_changing_schema(): void
    {
        foreach ([
            'visit_drafts' => '2026_11_03_173145_create_visit_drafts_table.php',
            'visit_amendments' => '2026_11_03_175934_create_visit_amendments_table.php',
        ] as $tableName => $migrationFile) {
            foreach ([DB::raw('CURRENT_TIMESTAMP'), 'NULL'] as $default) {
                Schema::table($tableName, function (Blueprint $table) use ($default): void {
                    $table->timestamp('created_at')->nullable()->default($default)->change();
                });
                $columnsBefore = Schema::getColumns($tableName);

                try {
                    $this->migration($migrationFile)->up();
                    $this->fail('A timestamp expression or string default must remain incompatible.');
                } catch (RuntimeException $exception) {
                    $this->assertStringContainsString('incompatible nullability or default settings', $exception->getMessage());
                }

                $this->assertSame($columnsBefore, Schema::getColumns($tableName));
            }
        }
    }

    public function test_amendment_and_reference_retention_migrations_are_repeatable_and_preserve_history(): void
    {
        [$patient, $user, $visit] = $this->createClinicalParents();
        DB::table('visit_amendments')->insert([
            'visit_id' => $visit->id,
            'amended_by' => $user->id,
            'reason' => 'Synthetic amendment history.',
            'changed_fields' => json_encode(['prescription_items'], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $mappingId = $this->createMappingWithVersion();
        $snapshot = DB::table('symptom_medicine_map_versions')->where('symptom_medicine_map_id', $mappingId)->value('snapshot');

        $amendmentsMigration = $this->migration('2026_11_03_175934_create_visit_amendments_table.php');
        $amendmentsMigration->up();
        $amendmentsMigration->up();

        $retentionMigration = $this->migration('2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php');
        $retentionMigration->up();
        $retentionMigration->up();

        $this->assertSame(1, DB::table('visit_amendments')->count());
        $this->assertSame('Synthetic amendment history.', DB::table('visit_amendments')->value('reason'));
        $this->assertSame($snapshot, DB::table('symptom_medicine_map_versions')->where('symptom_medicine_map_id', $mappingId)->value('snapshot'));
        $this->assertSame(1, DB::table('symptom_medicine_map_versions')->count());
        $this->assertForeignKey('visit_amendments', 'visit_id', 'visits', 'restrict');
        $this->assertForeignKey('symptom_medicine_map_versions', 'symptom_medicine_map_id', 'symptom_medicine_map', 'restrict');
        $this->assertNotNull($patient->fresh());
    }

    public function test_retention_migration_repairs_each_missing_foreign_key_without_recreating_history(): void
    {
        [, $user, $visit] = $this->createClinicalParents();
        DB::table('visit_amendments')->insert([
            'visit_id' => $visit->id,
            'amended_by' => $user->id,
            'reason' => 'Synthetic retained amendment.',
            'changed_fields' => json_encode(['diagnosis_notes'], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $mappingId = $this->createMappingWithVersion();

        Schema::table('visit_amendments', function (Blueprint $table): void {
            $table->dropForeign(['visit_id']);
        });
        $this->migration('2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php')->up();
        $this->assertForeignKey('visit_amendments', 'visit_id', 'visits', 'restrict');
        $this->assertSame(1, DB::table('visit_amendments')->count());

        Schema::table('symptom_medicine_map_versions', function (Blueprint $table): void {
            $table->dropForeign(['symptom_medicine_map_id']);
        });
        $this->migration('2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php')->up();

        $this->assertForeignKey('symptom_medicine_map_versions', 'symptom_medicine_map_id', 'symptom_medicine_map', 'restrict');
        $this->assertSame(1, DB::table('symptom_medicine_map_versions')->where('symptom_medicine_map_id', $mappingId)->count());
    }

    public function test_retention_migration_converts_only_the_known_legacy_amendment_cascade(): void
    {
        [, $user, $visit] = $this->createClinicalParents();
        DB::table('visit_amendments')->insert([
            'visit_id' => $visit->id,
            'amended_by' => $user->id,
            'reason' => 'Synthetic legacy amendment.',
            'changed_fields' => json_encode(['chief_complaint'], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('visit_amendments', function (Blueprint $table): void {
            $table->dropForeign(['visit_id']);
            $table->foreign('visit_id', 'visit_amendments_visit_id_foreign')
                ->references('id')->on('visits')->cascadeOnDelete();
        });

        $this->migration('2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php')->up();

        $this->assertForeignKey('visit_amendments', 'visit_id', 'visits', 'restrict');
        $this->assertSame(1, DB::table('visit_amendments')->count());
    }

    public function test_retention_migration_refuses_orphans_and_unexpected_foreign_key_definitions(): void
    {
        Schema::table('symptom_medicine_map_versions', function (Blueprint $table): void {
            $table->dropForeign(['symptom_medicine_map_id']);
        });
        Schema::disableForeignKeyConstraints();
        DB::table('symptom_medicine_map_versions')->insert([
            'symptom_medicine_map_id' => 987654,
            'version_number' => 1,
            'snapshot' => json_encode(['provenance' => ['kind' => 'synthetic']], JSON_THROW_ON_ERROR),
            'archived_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Schema::enableForeignKeyConstraints();

        try {
            $this->migration('2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php')->up();
            $this->fail('Expected orphaned version references to stop the migration.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Orphaned symptom_medicine_map_versions.symptom_medicine_map_id', $exception->getMessage());
        }

        $this->assertSame(1, DB::table('symptom_medicine_map_versions')->where('symptom_medicine_map_id', 987654)->count());
        $this->assertFalse(Schema::hasForeignKey('symptom_medicine_map_versions', 'symptom_medicine_map_id'));

        Schema::table('visit_amendments', function (Blueprint $table): void {
            $table->dropForeign(['visit_id']);
            $table->foreign('visit_id', 'unexpected_visit_amendments_fk')->references('id')->on('users')->restrictOnDelete();
        });

        try {
            $this->migration('2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php')->up();
            $this->fail('Expected the unexpected amendment foreign key to stop the migration.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('unexpected reference', $exception->getMessage());
        }

        $unexpectedForeignKey = collect(Schema::getForeignKeys('visit_amendments'))
            ->first(fn (array $foreignKey): bool => $foreignKey['columns'] === ['visit_id']);
        $this->assertNotNull($unexpectedForeignKey);
        $this->assertSame('users', $unexpectedForeignKey['foreign_table']);
    }

    public function test_history_migrations_refuse_destructive_rollback(): void
    {
        foreach ([
            '2026_11_03_173145_create_visit_drafts_table.php',
            '2026_11_03_175934_create_visit_amendments_table.php',
            '2026_11_03_201208_harden_clinical_reference_and_amendment_retention.php',
        ] as $migrationFile) {
            try {
                $this->migration($migrationFile)->down();
                $this->fail("Expected {$migrationFile} rollback to be prohibited.");
            } catch (RuntimeException $exception) {
                $this->assertNotSame('', $exception->getMessage());
            }
        }

        $this->assertTrue(Schema::hasTable('visit_drafts'));
        $this->assertTrue(Schema::hasTable('visit_amendments'));
        $this->assertTrue(Schema::hasTable('symptom_medicine_map_versions'));
    }

    /** @return array{Patient, User, Visit} */
    private function createClinicalParents(): array
    {
        $patient = Patient::factory()->create();
        $user = User::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id, 'status' => 'draft']);

        return [$patient, $user, $visit];
    }

    private function createMappingWithVersion(): int
    {
        DB::table('symptoms')->insert(['name_en' => 'Synthetic retention symptom']);
        DB::table('medicines')->insert([
            'name' => 'Synthetic retention medicine',
            'potency' => '30C',
            'form' => 'drops',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $mappingId = (int) DB::table('symptom_medicine_map')->insertGetId([
            'symptom_id' => DB::table('symptoms')->value('id'),
            'medicine_id' => DB::table('medicines')->value('id'),
            'priority' => 2,
            'note' => 'Synthetic reference note',
            'is_approved' => false,
            'review_status' => 'draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('symptom_medicine_map_versions')->insert([
            'symptom_medicine_map_id' => $mappingId,
            'version_number' => 1,
            'snapshot' => json_encode([
                'review_status' => 'legacy_unreviewed',
                'provenance' => ['kind' => 'synthetic_historical_reference'],
            ], JSON_THROW_ON_ERROR),
            'archived_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $mappingId;
    }

    private function assertForeignKey(string $table, string $column, string $parentTable, string $onDelete): void
    {
        $foreignKey = collect(Schema::getForeignKeys($table))
            ->first(fn (array $foreignKey): bool => $foreignKey['columns'] === [$column]);

        $this->assertNotNull($foreignKey);
        $this->assertSame($parentTable, $foreignKey['foreign_table']);
        $this->assertSame(['id'], $foreignKey['foreign_columns']);
        $this->assertSame($onDelete, strtolower((string) $foreignKey['on_delete']));
    }

    private function migration(string $filename): object
    {
        return require database_path('migrations/'.$filename);
    }
}
