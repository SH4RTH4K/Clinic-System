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
        Schema::table('lab_investigations', function (Blueprint $table) {
            $table->string('code', 50)->nullable()->after('name');
            $table->string('name_bn', 255)->nullable()->after('code');
            $table->string('specimen_type', 50)->default('blood')->after('category');
            $table->decimal('standard_cost', 10, 2)->default(0.00)->after('specimen_type');
            $table->text('reference_range')->nullable()->after('default_instructions');
            $table->string('turnaround_time', 100)->nullable()->after('reference_range');

            $table->index('code', 'lab_investigations_code_idx');
            $table->index('specimen_type', 'lab_investigations_specimen_type_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lab_investigations', function (Blueprint $table) {
            $table->dropIndex('lab_investigations_code_idx');
            $table->dropIndex('lab_investigations_specimen_type_idx');
            $table->dropColumn([
                'code',
                'name_bn',
                'specimen_type',
                'standard_cost',
                'reference_range',
                'turnaround_time',
            ]);
        });
    }
};
