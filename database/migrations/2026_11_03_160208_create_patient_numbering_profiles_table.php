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
        Schema::create('patient_numbering_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('category', 100);
            $table->string('category_code', 10)->nullable();
            $table->string('prefix', 10);
            $table->boolean('include_year')->default(false);
            $table->boolean('reset_annually')->default(false);
            $table->string('separator', 3)->default('-');
            $table->unsignedTinyInteger('number_padding')->default(4);
            $table->unsignedInteger('starting_number')->default(1);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('patient_numbering_sequences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('patient_numbering_profile_id');
            $table->foreign('patient_numbering_profile_id', 'pn_seq_profile_fk')
                ->references('id')
                ->on('patient_numbering_profiles')
                ->cascadeOnDelete();
            $table->string('period_key', 20);
            $table->unsignedInteger('next_number');
            $table->timestamps();
            $table->unique(['patient_numbering_profile_id', 'period_key'], 'pn_seq_profile_period_unique');
        });

        $settings = DB::table('clinic_settings')->orderBy('id')->first();
        $now = now();
        $profileId = DB::table('patient_numbering_profiles')->insertGetId([
            'name' => 'General',
            'category' => 'General',
            'category_code' => null,
            'prefix' => $settings->patient_no_series ?? 'A',
            'include_year' => false,
            'reset_annually' => false,
            'separator' => '-',
            'number_padding' => 0,
            'starting_number' => $settings->patient_no_next ?? 1,
            'is_active' => true,
            'is_default' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('patient_numbering_sequences')->insert([
            'patient_numbering_profile_id' => $profileId,
            'period_key' => 'all',
            'next_number' => $settings->patient_no_next ?? 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('patient_numbering_profiles')->exists()) {
            throw new RuntimeException('Patient numbering profile settings must be removed through the application before this migration can be rolled back.');
        }

        Schema::dropIfExists('patient_numbering_sequences');
        Schema::dropIfExists('patient_numbering_profiles');
    }
};
