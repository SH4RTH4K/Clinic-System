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
        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('patient_numbering_profile_id')->nullable()->after('patient_series')
                ->constrained('patient_numbering_profiles')->nullOnDelete();
            $table->string('patient_category', 100)->nullable()->after('patient_numbering_profile_id');
            $table->string('patient_code', 100)->nullable()->unique()->after('patient_category');
            $table->string('patient_series', 50)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $hasProfileAssignments = DB::table('patients')
            ->whereNotNull('patient_numbering_profile_id')
            ->orWhereNotNull('patient_code')
            ->exists();

        if ($hasProfileAssignments) {
            throw new RuntimeException('Patient numbering profile assignments must be removed before this migration can be rolled back.');
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['patient_numbering_profile_id']);
            $table->dropUnique(['patient_code']);
            $table->dropColumn(['patient_numbering_profile_id', 'patient_category', 'patient_code']);
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->string('patient_series', 10)->change();
        });
    }
};
