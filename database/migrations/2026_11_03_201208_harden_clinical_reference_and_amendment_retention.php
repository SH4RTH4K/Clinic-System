<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureRestrictiveForeignKey(
            'visit_amendments',
            'visit_id',
            'visits',
            'visit_amendments_visit_restrict_fk',
            ['cascade'],
        );
        $this->ensureRestrictiveForeignKey(
            'symptom_medicine_map_versions',
            'symptom_medicine_map_id',
            'symptom_medicine_map',
            'symptom_map_versions_map_restrict_fk',
            [],
        );

        DB::table('symptom_medicine_map')
            ->where(function ($query): void {
                $query->where('is_approved', true)
                    ->orWhere('review_status', 'approved');
            })
            ->orderBy('id')
            ->chunkById(250, function ($mappings): void {
                foreach ($mappings as $mapping) {
                    $hasReviewerIdentity = filled($mapping->reviewed_by)
                        || filled($mapping->reviewer_name);
                    $hasApprovalEvidence = filled($mapping->source_title)
                        && filled($mapping->reviewed_at)
                        && $hasReviewerIdentity;
                    $isApprovedState = $mapping->review_status === 'approved'
                        && (bool) $mapping->is_approved;

                    if ($isApprovedState && $hasApprovalEvidence) {
                        continue;
                    }

                    $updates = ['is_approved' => false];
                    if ($mapping->review_status === 'approved') {
                        $updates['review_status'] = 'legacy_unreviewed';
                    }

                    DB::table('symptom_medicine_map')->where('id', $mapping->id)->update($updates);
                }
            });

        DB::table('symptom_medicine_map_versions')
            ->where('version_number', 1)
            ->orderBy('id')
            ->chunkById(250, function ($versions): void {
                foreach ($versions as $version) {
                    $snapshot = json_decode($version->snapshot, true, flags: JSON_THROW_ON_ERROR);
                    $hasReviewerIdentity = filled($snapshot['reviewed_by'] ?? null)
                        || filled($snapshot['reviewer_name'] ?? null);
                    $hasApprovalEvidence = filled($snapshot['source_title'] ?? null)
                        && filled($snapshot['reviewed_at'] ?? null)
                        && $hasReviewerIdentity;

                    if (($snapshot['review_status'] ?? null) !== 'approved' || $hasApprovalEvidence) {
                        continue;
                    }

                    $snapshot['review_status'] = 'legacy_unreviewed';
                    $snapshot['is_approved'] = false;

                    DB::table('symptom_medicine_map_versions')
                        ->where('id', $version->id)
                        ->update(['snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR)]);
                }
            });

    }

    public function down(): void
    {
        throw new RuntimeException(
            'Clinical review state and retained amendment/reference history cannot be rolled back safely.'
        );
    }

    /**
     * Ensure a single expected restrictive foreign key without dropping a constraint unless it is a known legacy definition.
     *
     * @param  array<int, string>  $knownLegacyDeleteRules
     */
    private function ensureRestrictiveForeignKey(
        string $tableName,
        string $column,
        string $parentTable,
        string $constraintName,
        array $knownLegacyDeleteRules,
    ): void {
        if (! Schema::hasTable($tableName)
            || ! Schema::hasColumn($tableName, $column)
            || ! Schema::hasTable($parentTable)
            || ! Schema::hasColumn($parentTable, 'id')) {
            throw new RuntimeException("Cannot verify {$tableName}.{$column} retention foreign key because the expected schema is incomplete.");
        }

        $foreignKeys = collect(Schema::getForeignKeys($tableName));
        $matching = $foreignKeys->filter(
            fn (array $foreignKey): bool => in_array($column, $foreignKey['columns'], true)
        );

        if ($matching->count() > 1) {
            throw new RuntimeException("Multiple {$tableName} foreign keys involve {$column}; review the schema manually.");
        }

        $foreignKey = $matching->first();
        if ($foreignKey !== null) {
            $referencesExpectedParent = $foreignKey['columns'] === [$column]
                && $foreignKey['foreign_table'] === $parentTable
                && $foreignKey['foreign_columns'] === ['id'];
            $deleteRule = strtolower((string) $foreignKey['on_delete']);

            if (! $referencesExpectedParent) {
                throw new RuntimeException("The {$tableName}.{$column} foreign key has an unexpected reference; it was not changed.");
            }

            if (in_array($deleteRule, ['restrict', 'no action'], true)) {
                return;
            }

            if (! in_array($deleteRule, $knownLegacyDeleteRules, true)) {
                throw new RuntimeException("The {$tableName}.{$column} foreign key has an unexpected delete rule ({$deleteRule}); it was not changed.");
            }

            if ($foreignKey['name'] === null && Schema::getConnection()->getDriverName() !== 'sqlite') {
                throw new RuntimeException("The {$tableName}.{$column} foreign key name cannot be determined safely; it was not changed.");
            }

        }

        $nameConflict = $foreignKeys->contains(
            fn (array $item): bool => $item['name'] === $constraintName && $item['name'] !== ($foreignKey['name'] ?? null)
        );
        if ($nameConflict) {
            throw new RuntimeException("The expected {$tableName} foreign-key name {$constraintName} is occupied by another constraint.");
        }

        $hasOrphans = DB::table($tableName)
            ->whereNotNull($column)
            ->whereNotExists(function ($query) use ($column, $parentTable, $tableName): void {
                $query->selectRaw('1')
                    ->from($parentTable)
                    ->whereColumn("{$parentTable}.id", "{$tableName}.{$column}");
            })
            ->exists();

        if ($hasOrphans) {
            throw new RuntimeException("Orphaned {$tableName}.{$column} values exist; resolve them manually before adding the restrictive foreign key.");
        }

        if ($foreignKey !== null) {
            Schema::table($tableName, function (Blueprint $table) use ($column, $foreignKey): void {
                if (Schema::getConnection()->getDriverName() === 'sqlite') {
                    $table->dropForeign([$column]);

                    return;
                }

                $table->dropForeign($foreignKey['name']);
            });
        }

        Schema::table($tableName, function (Blueprint $table) use ($column, $parentTable, $constraintName): void {
            $table->foreign($column, $constraintName)
                ->references('id')
                ->on($parentTable)
                ->restrictOnDelete();
        });
    }
};
