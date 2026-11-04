<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('visit_amendments') || ! Schema::hasTable('doctors')) {
            throw new RuntimeException('Visit amendments and Doctors must exist before recording cancellation Doctor attribution.');
        }

        if (! Schema::hasColumn('visit_amendments', 'amended_by_doctor_id')) {
            Schema::table('visit_amendments', function (Blueprint $table): void {
                $table->unsignedBigInteger('amended_by_doctor_id')->nullable();
            });
        }

        $doctorForeignKey = collect(Schema::getForeignKeys('visit_amendments'))
            ->first(fn (array $foreignKey): bool => $foreignKey['columns'] === ['amended_by_doctor_id']);

        if ($doctorForeignKey !== null) {
            if ($doctorForeignKey['foreign_table'] !== 'doctors'
                || $doctorForeignKey['foreign_columns'] !== ['id']
                || ! in_array(strtolower((string) $doctorForeignKey['on_delete']), ['restrict', 'no action', ''], true)) {
                throw new RuntimeException('visit_amendments.amended_by_doctor_id has an unexpected foreign key; review the schema manually.');
            }
        } else {
            $orphanedDoctorIds = DB::table('visit_amendments as amendments')
                ->leftJoin('doctors', 'doctors.id', '=', 'amendments.amended_by_doctor_id')
                ->whereNotNull('amendments.amended_by_doctor_id')
                ->whereNull('doctors.id')
                ->limit(20)
                ->pluck('amendments.id');

            if ($orphanedDoctorIds->isNotEmpty()) {
                throw new RuntimeException('Cannot protect amendment Doctor attribution; review amendment IDs: '.$orphanedDoctorIds->implode(', '));
            }

            Schema::table('visit_amendments', function (Blueprint $table): void {
                $table->foreign('amended_by_doctor_id', 'visit_amendments_actor_doctor_restrict_foreign')
                    ->references('id')
                    ->on('doctors')
                    ->restrictOnDelete();
            });
        }

        if (! Schema::hasTable('permissions')) {
            throw new RuntimeException('The permissions table must exist before adding visits.cancel_other.');
        }

        DB::table('permissions')->insertOrIgnore([
            'name' => 'visits.cancel_other',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Cancellation actor attribution and permission grants are protected history and cannot be removed by rollback.');
    }
};
