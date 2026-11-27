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
        Schema::table('symptoms', function (Blueprint $table) {
            $table->string('code', 50)->nullable()->after('name_en');
            $table->text('modalities')->nullable()->after('category');

            $table->index('code', 'symptoms_code_idx');
            $table->index('category', 'symptoms_category_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('symptoms', function (Blueprint $table) {
            $table->dropIndex('symptoms_code_idx');
            $table->dropIndex('symptoms_category_idx');
            $table->dropColumn(['code', 'modalities']);
        });
    }
};
