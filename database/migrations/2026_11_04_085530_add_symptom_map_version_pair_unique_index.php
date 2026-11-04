<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const VERSION_TABLE = 'symptom_medicine_map_versions';

    private const VERSION_COLUMNS = ['symptom_medicine_map_id', 'version_number'];

    private const VERSION_UNIQUE_INDEX = 'symptom_map_version_pair_unique';

    public function up(): void
    {
        if (! Schema::hasTable(self::VERSION_TABLE)) {
            throw new RuntimeException(
                'The Symptom Map version table is missing; review the migration history before applying this correction.'
            );
        }

        if (! Schema::hasColumns(self::VERSION_TABLE, [
            'id',
            'symptom_medicine_map_id',
            'version_number',
            'snapshot',
            'archived_by',
            'archived_at',
            'created_at',
            'updated_at',
        ])) {
            throw new RuntimeException(
                'The Symptom Map version table is incomplete; review its schema before applying this correction.'
            );
        }

        $hasPrimaryKey = collect(Schema::getIndexes(self::VERSION_TABLE))
            ->contains(fn (array $index): bool => ($index['primary'] ?? false) && $index['columns'] === ['id']);

        if (! $hasPrimaryKey) {
            throw new RuntimeException(
                'The Symptom Map version table has an inconsistent primary key; review its schema before applying this correction.'
            );
        }

        $this->assertExpectedForeignKeys();
        $this->ensureVersionUniqueIndex();
    }

    public function down(): void
    {
        throw new LogicException(
            'The Symptom Map version uniqueness safeguard is forward-only and cannot be removed by rollback.'
        );
    }

    private function assertExpectedForeignKeys(): void
    {
        $foreignKeys = collect(Schema::getForeignKeys(self::VERSION_TABLE));
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
                    "The Symptom Map version table has an inconsistent {$column} foreign key; review its schema before applying this correction."
                );
            }
        }
    }

    private function ensureVersionUniqueIndex(): void
    {
        $indexes = collect(Schema::getIndexes(self::VERSION_TABLE));
        $hasEquivalentUniqueIndex = $indexes->contains(
            fn (array $index): bool => $index['unique'] && $index['columns'] === self::VERSION_COLUMNS
        );

        if ($hasEquivalentUniqueIndex) {
            return;
        }

        $hasConflictingIndexName = $indexes->contains(
            fn (array $index): bool => $index['name'] === self::VERSION_UNIQUE_INDEX
        );

        if ($hasConflictingIndexName) {
            throw new RuntimeException(
                'The Symptom Map version unique-index name is already used by a different index; review its schema before applying this correction.'
            );
        }

        $hasDuplicateVersions = DB::table(self::VERSION_TABLE)
            ->select(self::VERSION_COLUMNS)
            ->groupBy(self::VERSION_COLUMNS)
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicateVersions) {
            throw new RuntimeException(
                'Duplicate Symptom Map version pairs exist; resolve them manually before adding the unique constraint.'
            );
        }

        Schema::table(self::VERSION_TABLE, function (Blueprint $table): void {
            $table->unique(self::VERSION_COLUMNS, self::VERSION_UNIQUE_INDEX);
        });
    }
};
