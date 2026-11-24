<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->date('manual_last_visit_date')->nullable()->after('medical_history');
            $table->unsignedInteger('legacy_visits_count')->nullable()->default(0)->after('manual_last_visit_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['manual_last_visit_date', 'legacy_visits_count']);
        });
    }
};
