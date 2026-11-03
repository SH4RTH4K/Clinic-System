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
        Schema::table('clinic_settings', function (Blueprint $table): void {
            $table->string('patient_no_series', 10)->default('A')->change();
        });

        Schema::table('patients', function (Blueprint $table): void {
            $table->string('patient_series', 10)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $hasLongSettingsPrefix = DB::table('clinic_settings')->whereRaw('length(patient_no_series) > 1')->exists();
        $hasLongPatientPrefix = DB::table('patients')->whereRaw('length(patient_series) > 1')->exists();

        if ($hasLongSettingsPrefix || $hasLongPatientPrefix) {
            throw new RuntimeException('Patient number prefixes must be reduced to one character before this migration can be rolled back.');
        }

        Schema::table('clinic_settings', function (Blueprint $table): void {
            $table->char('patient_no_series', 1)->default('A')->change();
        });

        Schema::table('patients', function (Blueprint $table): void {
            $table->char('patient_series', 1)->change();
        });
    }
};
