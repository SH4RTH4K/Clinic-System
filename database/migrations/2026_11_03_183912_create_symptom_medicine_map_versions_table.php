<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const VERSION_UNIQUE_INDEX = 'symptom_map_version_pair_unique';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->ensureVersionTable();

        DB::table('symptom_medicine_map')
            ->leftJoin('symptoms', 'symptoms.id', '=', 'symptom_medicine_map.symptom_id')
            ->leftJoin('medicines', 'medicines.id', '=', 'symptom_medicine_map.medicine_id')
            ->where('symptom_medicine_map.is_approved', true)
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('symptom_medicine_map_versions')
                    ->whereColumn(
                        'symptom_medicine_map_versions.symptom_medicine_map_id',
                        'symptom_medicine_map.id'
                    )
                    ->where('symptom_medicine_map_versions.version_number', 1);
            })
            ->select('symptom_medicine_map.*', 'symptoms.name_en as symptom_name', 'medicines.name as medicine_name')
            ->orderBy('symptom_medicine_map.id')
            ->chunkById(500, function ($mappings): void {
                $timestamp = now();
                $versions = $mappings->map(fn (object $mapping): array => [
                    'symptom_medicine_map_id' => $mapping->id,
                    'version_number' => 1,
                    'snapshot' => json_encode([
                        'symptom_id' => $mapping->symptom_id,
                        'symptom_name' => $mapping->symptom_name,
                        'medicine_id' => $mapping->medicine_id,
                        'medicine_name' => $mapping->medicine_name,
                        'priority' => $mapping->priority,
                        'note' => $mapping->note,
                        'source_title' => $mapping->source_title,
                        'source_author' => $mapping->source_author,
                        'source_edition' => $mapping->source_edition,
                        'source_page' => $mapping->source_page,
                        'source_url' => $mapping->source_url,
                        'review_status' => 'legacy_unreviewed',
                        'is_approved' => false,
                        'reviewed_by' => null,
                        'reviewer_name' => null,
                        'reviewed_at' => null,
                        'review_note' => null,
                        'provenance' => [
                            'kind' => 'legacy_migration_snapshot',
                            'status' => 'manual_review_required',
                            'reason' => 'point_in_time_catalog_and_clinical_approval_not_verified',
                        ],
                    ], JSON_THROW_ON_ERROR),
                    'archived_by' => null,
                    'archived_at' => $timestamp,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ])->all();

                DB::table('symptom_medicine_map_versions')->insertOrIgnore($versions);
            }, 'symptom_medicine_map.id', 'id');

        DB::table('symptom_medicine_map')
            ->where('review_status', 'pending_review')
            ->update(['is_approved' => false]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Symptom Map clinical reference versions are protected history and cannot be removed by rollback.'
        );
    }

    private function ensureVersionTable(): void
    {
        if (! Schema::hasTable('symptom_medicine_map_versions')) {
            Schema::create('symptom_medicine_map_versions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('symptom_medicine_map_id')->constrained('symptom_medicine_map')->restrictOnDelete();
                $table->unsignedInteger('version_number');
                $table->json('snapshot');
                $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('archived_at');
                $table->timestamps();
                $table->unique(
                    ['symptom_medicine_map_id', 'version_number'],
                    self::VERSION_UNIQUE_INDEX
                );
            });
        }

        if (! Schema::hasColumns('symptom_medicine_map_versions', [
            'id', 'symptom_medicine_map_id', 'version_number', 'snapshot', 'archived_by', 'archived_at', 'created_at', 'updated_at',
        ])) {
            throw new RuntimeException(
                'The existing Symptom Map version table is incomplete; review its schema before retrying this migration.'
            );
        }

        $hasPrimaryKey = collect(Schema::getIndexes('symptom_medicine_map_versions'))
            ->contains(fn (array $index): bool => ($index['primary'] ?? false) && $index['columns'] === ['id']);

        if (! $hasPrimaryKey) {
            throw new RuntimeException(
                'The existing Symptom Map version table has an inconsistent primary key; review its schema before retrying this migration.'
            );
        }

        $this->ensureVersionForeignKeys();
        $this->ensureVersionUniqueIndex();
    }

    private function ensureVersionForeignKeys(): void
    {
        $foreignKeys = collect(Schema::getForeignKeys('symptom_medicine_map_versions'));
        $expectedForeignKeys = [
            'symptom_medicine_map_id' => [
                'table' => 'symptom_medicine_map',
                'columns' => ['id'],
                'on_delete' => 'restrict',
            ],
            'archived_by' => [
                'table' => 'users',
                'columns' => ['id'],
                'on_delete' => 'set null',
            ],
        ];

        foreach ($expectedForeignKeys as $column => $expected) {
            $foreignKey = $foreignKeys->first(
                fn (array $foreignKey): bool => $foreignKey['columns'] === [$column]
            );

            if ($foreignKey === null
                || $foreignKey['foreign_table'] !== $expected['table']
                || $foreignKey['foreign_columns'] !== $expected['columns']
                || strtolower((string) $foreignKey['on_delete']) !== $expected['on_delete']) {
                throw new RuntimeException(
                    "The existing Symptom Map version table has an inconsistent {$column} foreign key; review its schema before retrying this migration."
                );
            }
        }
    }

    private function ensureVersionUniqueIndex(): void
    {
        $indexes = collect(Schema::getIndexes('symptom_medicine_map_versions'));
        $versionColumns = ['symptom_medicine_map_id', 'version_number'];

        $hasVersionUniqueIndex = $indexes->contains(
            fn (array $index): bool => $index['unique'] && $index['columns'] === $versionColumns
        );

        if ($hasVersionUniqueIndex) {
            return;
        }

        $hasConflictingIndexName = $indexes->contains(
            fn (array $index): bool => $index['name'] === self::VERSION_UNIQUE_INDEX
        );

        if ($hasConflictingIndexName) {
            throw new RuntimeException(
                'The Symptom Map version unique-index name is already used by a different index; review its schema before retrying this migration.'
            );
        }

        $hasDuplicateVersions = DB::table('symptom_medicine_map_versions')
            ->select($versionColumns)
            ->groupBy($versionColumns)
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicateVersions) {
            throw new RuntimeException(
                'Duplicate Symptom Map version pairs exist; resolve them manually before adding the unique constraint.'
            );
        }

        Schema::table('symptom_medicine_map_versions', function (Blueprint $table): void {
            $table->unique(
                ['symptom_medicine_map_id', 'version_number'],
                self::VERSION_UNIQUE_INDEX
            );
        });
    }
};
