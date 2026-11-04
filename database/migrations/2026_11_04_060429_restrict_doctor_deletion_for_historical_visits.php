<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (['visits', 'doctors'] as $requiredTable) {
            if (! Schema::hasTable($requiredTable)) {
                throw new RuntimeException("Cannot protect Doctor visit history because the {$requiredTable} table is missing.");
            }
        }

        if (! Schema::hasColumn('visits', 'doctor_id')) {
            throw new RuntimeException('Cannot protect Doctor visit history because visits.doctor_id is missing.');
        }

        $doctorForeignKeys = collect(Schema::getForeignKeys('visits'))
            ->filter(fn (array $foreignKey): bool => in_array('doctor_id', $foreignKey['columns'], true))
            ->values();

        if ($doctorForeignKeys->count() > 1) {
            throw new RuntimeException('Multiple foreign keys use visits.doctor_id; review the schema manually.');
        }

        $foreignKey = $doctorForeignKeys->first();

        if ($foreignKey !== null
            && ($foreignKey['foreign_table'] !== 'doctors' || $foreignKey['columns'] !== ['doctor_id'])) {
            throw new RuntimeException('The visits.doctor_id foreign key has an unexpected target; review the schema manually.');
        }

        if ($foreignKey !== null && in_array(strtolower((string) $foreignKey['on_delete']), ['restrict', 'no action', ''], true)) {
            return;
        }

        $orphanedVisitIds = DB::table('visits as visits')
            ->leftJoin('doctors', 'doctors.id', '=', 'visits.doctor_id')
            ->whereNotNull('visits.doctor_id')
            ->whereNull('doctors.id')
            ->orderBy('visits.id')
            ->limit(20)
            ->pluck('visits.id');

        if ($orphanedVisitIds->isNotEmpty()) {
            throw new RuntimeException(
                'Cannot apply restrictive Doctor history protection; review orphaned visit IDs: '
                .$orphanedVisitIds->implode(', '),
            );
        }

        if ($foreignKey !== null) {
            Schema::table('visits', function (Blueprint $table) use ($foreignKey): void {
                $table->dropForeign($foreignKey['name'] ?? ['doctor_id']);
            });
        }

        Schema::table('visits', function (Blueprint $table): void {
            $table->foreign('doctor_id', 'visits_doctor_id_restrict_foreign')
                ->references('id')
                ->on('doctors')
                ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new LogicException('This Doctor history protection migration is forward-only. Restore a verified backup or apply a reviewed forward correction.');
    }
};
