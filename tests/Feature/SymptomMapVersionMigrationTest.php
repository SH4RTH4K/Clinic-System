<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class SymptomMapVersionMigrationTest extends TestCase
{
    private const VERSION_TABLE = 'symptom_medicine_map_versions';

    private const UNIQUE_INDEX = 'symptom_map_version_pair_unique';

    private string $originalMigrationPath;

    private string $correctionMigrationPath;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('database.default', 'sqlite');
        Config::set('database.connections.sqlite.database', ':memory:');
        Config::set('database.connections.sqlite.url', null);
        DB::purge('sqlite');

        if (DB::connection()->getDriverName() !== 'sqlite'
            || DB::connection()->getDatabaseName() !== ':memory:') {
            throw new LogicException('Symptom Map migration tests must use isolated in-memory SQLite.');
        }

        $this->originalMigrationPath = database_path(
            'migrations/2026_11_03_183912_create_symptom_medicine_map_versions_table.php'
        );
        $this->correctionMigrationPath = database_path(
            'migrations/2026_11_04_085530_add_symptom_map_version_pair_unique_index.php'
        );

        $this->createSourceTables();
    }

    protected function tearDown(): void
    {
        DB::disconnect('sqlite');
        DB::purge('sqlite');

        parent::tearDown();
    }

    public function test_fresh_version_table_uses_short_unique_index_and_expected_foreign_keys(): void
    {
        $this->runOriginalMigration();

        $this->assertTrue(Schema::hasTable(self::VERSION_TABLE));
        $this->assertTrue($this->hasUniqueIndex(self::UNIQUE_INDEX));
        $this->assertSame(
            ['symptom_medicine_map_id', 'version_number'],
            $this->indexByName(self::UNIQUE_INDEX)['columns']
        );

        $foreignKeys = collect(Schema::getForeignKeys(self::VERSION_TABLE));
        $this->assertSame(
            'restrict',
            strtolower((string) $foreignKeys->firstWhere('columns', ['symptom_medicine_map_id'])['on_delete'])
        );
        $this->assertSame(
            'set null',
            strtolower((string) $foreignKeys->firstWhere('columns', ['archived_by'])['on_delete'])
        );
    }

    public function test_original_migration_repairs_partial_table_without_unique_index(): void
    {
        $this->createVersionTable();
        $this->createApprovedMapping();

        $this->runOriginalMigration();

        $this->assertTrue($this->hasUniqueIndex(self::UNIQUE_INDEX));
        $this->assertDatabaseHas(self::VERSION_TABLE, [
            'symptom_medicine_map_id' => 10,
            'version_number' => 1,
        ]);
    }

    public function test_equivalent_unique_index_under_another_name_is_preserved(): void
    {
        $this->createVersionTable('legacy_version_pair_unique');
        $this->createApprovedMapping(false);
        $this->createVersion(10, 3, ['note' => 'existing snapshot']);

        $this->runOriginalMigration();
        $this->runCorrectionMigration();

        $this->assertTrue($this->hasUniqueIndex('legacy_version_pair_unique'));
        $this->assertFalse($this->hasUniqueIndex(self::UNIQUE_INDEX));
        $this->assertSame(1, DB::table(self::VERSION_TABLE)->count());
        $this->assertSame(
            ['note' => 'existing snapshot'],
            json_decode(DB::table(self::VERSION_TABLE)->value('snapshot'), true, flags: JSON_THROW_ON_ERROR)
        );
    }

    public function test_duplicate_version_pairs_stop_before_index_creation_or_snapshot_changes(): void
    {
        $this->createVersionTable();
        $this->createApprovedMapping(false);
        $this->createVersion(10, 1, ['note' => 'first']);
        $this->createVersion(10, 1, ['note' => 'second']);
        $before = DB::table(self::VERSION_TABLE)->orderBy('id')->pluck('snapshot')->all();

        try {
            $this->runOriginalMigration();
            $this->fail('Duplicate version pairs must prevent the migration from adding the unique index.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Duplicate Symptom Map version pairs', $exception->getMessage());
        }

        $this->assertFalse($this->hasUniqueIndex(self::UNIQUE_INDEX));
        $this->assertSame($before, DB::table(self::VERSION_TABLE)->orderBy('id')->pluck('snapshot')->all());
    }

    public function test_index_name_conflict_stops_without_creating_an_alternate_index(): void
    {
        $this->createVersionTable();
        Schema::table(self::VERSION_TABLE, function (Blueprint $table): void {
            $table->index('version_number', self::UNIQUE_INDEX);
        });
        $existingIndexNames = collect(Schema::getIndexes(self::VERSION_TABLE))
            ->pluck('name')
            ->sort()
            ->values()
            ->all();

        try {
            $this->runOriginalMigration();
            $this->fail('An index-name conflict must stop the migration.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('already used by a different index', $exception->getMessage());
        }

        $this->assertFalse($this->indexByName(self::UNIQUE_INDEX)['unique']);
        $this->assertSame(
            $existingIndexNames,
            collect(Schema::getIndexes(self::VERSION_TABLE))->pluck('name')->sort()->values()->all()
        );
    }

    public function test_original_migration_retry_is_idempotent_and_preserves_existing_snapshots(): void
    {
        $this->createVersionTable();
        $this->createApprovedMapping();
        $this->createVersion(10, 1, ['note' => 'approved historical snapshot']);

        $this->runOriginalMigration();
        $this->runOriginalMigration();

        $this->assertSame(1, DB::table(self::VERSION_TABLE)->count());
        $this->assertSame(
            ['note' => 'approved historical snapshot'],
            json_decode(DB::table(self::VERSION_TABLE)->value('snapshot'), true, flags: JSON_THROW_ON_ERROR)
        );
    }

    public function test_forward_correction_repairs_partial_schema_and_is_idempotent(): void
    {
        $this->createVersionTable();

        $this->runCorrectionMigration();
        $this->runCorrectionMigration();

        $this->assertTrue($this->hasUniqueIndex(self::UNIQUE_INDEX));
        $this->assertSame(0, DB::table(self::VERSION_TABLE)->count());
    }

    public function test_forward_correction_refuses_duplicate_pairs_and_incomplete_schema(): void
    {
        $this->createVersionTable();
        $this->createApprovedMapping(false);
        $this->createVersion(10, 1, ['note' => 'first']);
        $this->createVersion(10, 1, ['note' => 'second']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Duplicate Symptom Map version pairs');
        $this->runCorrectionMigration();
    }

    public function test_forward_correction_refuses_missing_required_columns(): void
    {
        Schema::create(self::VERSION_TABLE, function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('version_number');
        });

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('table is incomplete');
        $this->runCorrectionMigration();
    }

    public function test_forward_correction_refuses_inconsistent_primary_key(): void
    {
        $this->createVersionTable(withPrimaryKey: false);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('inconsistent primary key');
        $this->runCorrectionMigration();
    }

    public function test_both_migrations_refuse_destructive_rollback(): void
    {
        foreach ([$this->originalMigrationPath, $this->correctionMigrationPath] as $path) {
            $migration = require $path;

            try {
                $migration->down();
                $this->fail('Protected Symptom Map version migrations must refuse rollback.');
            } catch (RuntimeException|LogicException $exception) {
                $this->assertStringContainsString('cannot', strtolower($exception->getMessage()));
            }
        }
    }

    private function createSourceTables(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
        });
        Schema::create('symptoms', function (Blueprint $table): void {
            $table->id();
            $table->string('name_en');
        });
        Schema::create('medicines', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
        });
        Schema::create('symptom_medicine_map', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('symptom_id');
            $table->unsignedBigInteger('medicine_id');
            $table->unsignedInteger('priority')->default(0);
            $table->text('note')->nullable();
            $table->string('source_title')->nullable();
            $table->string('source_author')->nullable();
            $table->string('source_edition')->nullable();
            $table->string('source_page')->nullable();
            $table->string('source_url', 2048)->nullable();
            $table->string('review_status', 24)->default('pending_review');
            $table->boolean('is_approved')->default(false);
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->string('reviewer_name')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
        });
    }

    private function createVersionTable(?string $uniqueIndexName = null, bool $withPrimaryKey = true): void
    {
        Schema::create(self::VERSION_TABLE, function (Blueprint $table) use ($uniqueIndexName, $withPrimaryKey): void {
            if ($withPrimaryKey) {
                $table->id();
            } else {
                $table->unsignedBigInteger('id');
            }

            $table->foreignId('symptom_medicine_map_id')
                ->constrained('symptom_medicine_map')
                ->restrictOnDelete();
            $table->unsignedInteger('version_number');
            $table->json('snapshot');
            $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('archived_at');
            $table->timestamps();

            if ($uniqueIndexName !== null) {
                $table->unique(['symptom_medicine_map_id', 'version_number'], $uniqueIndexName);
            }
        });
    }

    private function createApprovedMapping(bool $approved = true): void
    {
        DB::table('symptoms')->insert(['id' => 1, 'name_en' => 'Synthetic symptom']);
        DB::table('medicines')->insert(['id' => 1, 'name' => 'Synthetic medicine']);
        DB::table('symptom_medicine_map')->insert([
            'id' => 10,
            'symptom_id' => 1,
            'medicine_id' => 1,
            'priority' => 2,
            'note' => 'Synthetic note',
            'review_status' => $approved ? 'approved' : 'draft',
            'is_approved' => $approved,
        ]);
    }

    /** @param array<string, mixed> $snapshot */
    private function createVersion(int $mappingId, int $versionNumber, array $snapshot): void
    {
        DB::table(self::VERSION_TABLE)->insert([
            'symptom_medicine_map_id' => $mappingId,
            'version_number' => $versionNumber,
            'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR),
            'archived_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function runOriginalMigration(): void
    {
        $migration = require $this->originalMigrationPath;
        $migration->up();
    }

    private function runCorrectionMigration(): void
    {
        $migration = require $this->correctionMigrationPath;
        $migration->up();
    }

    private function hasUniqueIndex(string $name): bool
    {
        return $this->indexByName($name)['unique'] ?? false;
    }

    /** @return array<string, mixed> */
    private function indexByName(string $name): array
    {
        foreach (Schema::getIndexes(self::VERSION_TABLE) as $index) {
            if ($index['name'] === $name) {
                return $index;
            }
        }

        return [];
    }
}
