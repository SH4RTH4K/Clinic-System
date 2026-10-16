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
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->string('dose_unit', 50)->default('drops')->change();
            $table->string('before_after', 50)->default('after')->change();
            $table->decimal('dose_qty', 8, 2)->default(5)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->enum('dose_unit', ['drops', 'pills'])->default('drops')->change();
            $table->enum('before_after', ['before', 'after'])->default('after')->change();
            $table->integer('dose_qty')->default(5)->change();
        });
    }
};
