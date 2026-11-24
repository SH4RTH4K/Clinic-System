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
        Schema::table('visits', function (Blueprint $table) {
            $table->string('provisional_diagnosis', 255)->nullable()->after('diagnosis_notes');
            $table->string('final_diagnosis', 255)->nullable()->after('provisional_diagnosis');
        });

        Schema::table('prescription_items', function (Blueprint $table) {
            $table->foreignId('medicine_id')->nullable()->change();
            $table->string('item_type', 30)->default('remedy')->after('visit_id');
            $table->foreignId('pharmaceutical_id')->nullable()->after('medicine_id')->constrained('pharmaceuticals')->nullOnDelete();
            $table->string('brand_name', 255)->nullable()->after('pharmaceutical_id');
            $table->string('generic_name', 255)->nullable()->after('brand_name');
            $table->string('strength', 100)->nullable()->after('generic_name');
            $table->string('dosage_form', 50)->nullable()->after('strength');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->dropForeign(['pharmaceutical_id']);
            $table->dropColumn([
                'item_type',
                'pharmaceutical_id',
                'brand_name',
                'generic_name',
                'strength',
                'dosage_form',
            ]);
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn(['provisional_diagnosis', 'final_diagnosis']);
        });
    }
};
