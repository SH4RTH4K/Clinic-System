<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('appointment_requests') || ! Schema::hasTable('patients')) {
            throw new RuntimeException('Appointment requests and patients must exist before conversion links can be added.');
        }

        if (! Schema::hasColumn('appointment_requests', 'converted_patient_id')) {
            Schema::table('appointment_requests', function (Blueprint $table): void {
                $table->foreignId('converted_patient_id')->nullable();
            });
        }

        $column = collect(Schema::getColumns('appointment_requests'))
            ->firstWhere('name', 'converted_patient_id');
        $type = strtolower((string) ($column['type'] ?? $column['type_name'] ?? ''));
        $driver = DB::connection()->getDriverName();
        $validType = $driver === 'sqlite'
            ? in_array($type, ['integer', 'int', 'bigint'], true)
            : str_starts_with($type, 'bigint') && str_contains($type, 'unsigned');

        if ($column === null || ! $column['nullable'] || ! $validType) {
            throw new RuntimeException('The appointment_requests.converted_patient_id column is incompatible; no request or patient records were changed.');
        }

        $matchingForeignKeys = collect(Schema::getForeignKeys('appointment_requests'))
            ->filter(fn (array $foreignKey): bool => $foreignKey['columns'] === ['converted_patient_id']);

        if ($matchingForeignKeys->count() > 1) {
            throw new RuntimeException('Multiple appointment conversion foreign keys exist; manual review is required.');
        }

        $foreignKey = $matchingForeignKeys->first();

        if ($foreignKey !== null) {
            if ($foreignKey['foreign_table'] !== 'patients'
                || $foreignKey['foreign_columns'] !== ['id']
                || strtolower((string) $foreignKey['on_delete']) !== 'restrict') {
                throw new RuntimeException('The appointment conversion foreign key is incompatible; manual review is required.');
            }

            return;
        }

        $hasOrphans = DB::table('appointment_requests as requests')
            ->leftJoin('patients', 'patients.id', '=', 'requests.converted_patient_id')
            ->whereNotNull('requests.converted_patient_id')
            ->whereNull('patients.id')
            ->exists();

        if ($hasOrphans) {
            throw new RuntimeException('Appointment requests contain orphaned patient links; no records were changed.');
        }

        Schema::table('appointment_requests', function (Blueprint $table): void {
            $table->foreign('converted_patient_id', 'appt_req_converted_patient_fk')
                ->references('id')
                ->on('patients')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('appointment_requests', 'converted_patient_id')) {
            return;
        }

        if (DB::table('appointment_requests')->whereNotNull('converted_patient_id')->exists()) {
            throw new RuntimeException('Appointment requests are linked to patient records; the conversion link cannot be rolled back safely.');
        }

        $foreignKey = collect(Schema::getForeignKeys('appointment_requests'))
            ->first(fn (array $key): bool => $key['columns'] === ['converted_patient_id']);

        if ($foreignKey !== null) {
            if ($foreignKey['foreign_table'] !== 'patients'
                || $foreignKey['foreign_columns'] !== ['id']
                || strtolower((string) $foreignKey['on_delete']) !== 'restrict') {
                throw new RuntimeException('The appointment conversion foreign key is unfamiliar; rollback was refused.');
            }

            Schema::table('appointment_requests', function (Blueprint $table) use ($foreignKey): void {
                $table->dropForeign($foreignKey['name']);
            });
        }

        Schema::table('appointment_requests', function (Blueprint $table): void {
            $table->dropColumn('converted_patient_id');
        });
    }
};
