<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLE = 'visit_amendments';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable(self::TABLE)) {
            Schema::create(self::TABLE, function (Blueprint $table): void {
                $table->id();
                $table->unsignedBigInteger('visit_id');
                $table->unsignedBigInteger('amended_by');
                $table->text('reason');
                $table->json('changed_fields');
                $table->timestamps();
                $table->index('visit_id', 'visit_amendments_visit_id_index');
                $table->index('amended_by', 'visit_amendments_amended_by_index');
                $table->foreign('visit_id', 'visit_amendments_visit_id_foreign')
                    ->references('id')->on('visits')->restrictOnDelete();
                $table->foreign('amended_by', 'visit_amendments_amended_by_foreign')
                    ->references('id')->on('users')->restrictOnDelete();
            });
        }

        $this->assertExpectedColumns();
        $this->ensureIndex('visit_id', 'visit_amendments_visit_id_index');
        $this->ensureIndex('amended_by', 'visit_amendments_amended_by_index');
        $this->ensureRestrictiveForeignKey('visit_id', 'visits', 'visit_amendments_visit_id_foreign', true);
        $this->ensureRestrictiveForeignKey('amended_by', 'users', 'visit_amendments_amended_by_foreign', false);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Visit amendment history is protected clinical history and cannot be removed by rollback.'
        );
    }

    private function assertExpectedColumns(): void
    {
        if (! Schema::hasColumns(self::TABLE, ['id', 'visit_id', 'amended_by', 'reason', 'changed_fields', 'created_at', 'updated_at'])) {
            throw new RuntimeException('The existing visit_amendments table is incomplete. Review it before retrying this migration.');
        }

        $columns = collect(Schema::getColumns(self::TABLE))->keyBy('name');
        foreach (['id', 'visit_id', 'amended_by', 'reason', 'changed_fields'] as $column) {
            if ($columns[$column]['nullable'] || $columns[$column]['default'] !== null) {
                throw new RuntimeException("The existing visit_amendments.{$column} column has incompatible nullability or default settings.");
            }
        }

        foreach (['created_at', 'updated_at'] as $column) {
            if (! $columns[$column]['nullable'] || $columns[$column]['default'] !== null) {
                throw new RuntimeException("The existing visit_amendments.{$column} column has incompatible nullability or default settings.");
            }
        }

        $hasPrimaryKey = collect(Schema::getIndexes(self::TABLE))->contains(
            fn (array $index): bool => $index['primary'] && $index['columns'] === ['id']
        );

        if (! $hasPrimaryKey) {
            throw new RuntimeException('The existing visit_amendments table has an inconsistent primary key. Review it before retrying this migration.');
        }
    }

    private function ensureIndex(string $column, string $name): void
    {
        $indexes = collect(Schema::getIndexes(self::TABLE));
        $columnIndex = $indexes->first(fn (array $index): bool => $index['columns'] === [$column]);

        if ($columnIndex !== null && $columnIndex['unique']) {
            throw new RuntimeException("The visit_amendments.{$column} column has an unexpected unique index.");
        }

        if ($indexes->contains(fn (array $index): bool => $index['columns'] === [$column] && ! $index['unique'])) {
            return;
        }

        if ($indexes->contains(fn (array $index): bool => $index['name'] === $name)) {
            throw new RuntimeException("The expected visit_amendments index name {$name} is used by an incompatible index.");
        }

        Schema::table(self::TABLE, function (Blueprint $table) use ($column, $name): void {
            $table->index($column, $name);
        });
    }

    private function ensureRestrictiveForeignKey(string $column, string $parentTable, string $newName, bool $cascadeIsKnownLegacy): void
    {
        if (! Schema::hasTable($parentTable) || ! Schema::hasColumn($parentTable, 'id')) {
            throw new RuntimeException("The parent table for visit_amendments.{$column} is unavailable; the foreign key was not changed.");
        }

        $foreignKeys = collect(Schema::getForeignKeys(self::TABLE));
        $matching = $foreignKeys->filter(
            fn (array $foreignKey): bool => in_array($column, $foreignKey['columns'], true)
        );

        if ($matching->count() > 1) {
            throw new RuntimeException("Multiple visit_amendments foreign keys involve {$column}; review the schema manually.");
        }

        $foreignKey = $matching->first();
        if ($foreignKey !== null) {
            $referencesExpectedParent = $foreignKey['columns'] === [$column]
                && $foreignKey['foreign_table'] === $parentTable
                && $foreignKey['foreign_columns'] === ['id'];
            $deleteRule = strtolower((string) $foreignKey['on_delete']);

            if (! $referencesExpectedParent || ! in_array($deleteRule, ['restrict', 'no action', 'cascade'], true)) {
                throw new RuntimeException("The visit_amendments.{$column} foreign key has an unexpected definition; it was not changed.");
            }

            if (in_array($deleteRule, ['restrict', 'no action'], true)) {
                return;
            }

            if (! $cascadeIsKnownLegacy) {
                throw new RuntimeException("The visit_amendments.{$column} foreign key uses an unexpected cascade rule; it was not changed.");
            }

            if ($foreignKey['name'] === null && Schema::getConnection()->getDriverName() !== 'sqlite') {
                throw new RuntimeException("The visit_amendments.{$column} foreign key has no discoverable name; it was not changed.");
            }

        }

        $conflictingName = $foreignKeys->contains(
            fn (array $item): bool => $item['name'] === $newName && $item['name'] !== ($foreignKey['name'] ?? null)
        );
        if ($conflictingName) {
            throw new RuntimeException("The expected visit_amendments foreign-key name {$newName} is occupied by another constraint.");
        }

        $hasOrphans = DB::table(self::TABLE)
            ->whereNotNull($column)
            ->whereNotExists(function ($query) use ($column, $parentTable): void {
                $query->selectRaw('1')
                    ->from($parentTable)
                    ->whereColumn("{$parentTable}.id", self::TABLE.".{$column}");
            })
            ->exists();

        if ($hasOrphans) {
            throw new RuntimeException("Orphaned visit_amendments.{$column} references exist; resolve them manually before adding the restrictive foreign key.");
        }

        if ($foreignKey !== null) {
            Schema::table(self::TABLE, function (Blueprint $table) use ($column, $foreignKey): void {
                if (Schema::getConnection()->getDriverName() === 'sqlite') {
                    $table->dropForeign([$column]);

                    return;
                }

                $table->dropForeign($foreignKey['name']);
            });
        }

        Schema::table(self::TABLE, function (Blueprint $table) use ($column, $parentTable, $newName): void {
            $table->foreign($column, $newName)->references('id')->on($parentTable)->restrictOnDelete();
        });
    }
};
