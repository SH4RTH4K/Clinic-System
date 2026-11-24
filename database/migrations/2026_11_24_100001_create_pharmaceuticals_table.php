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
        Schema::create('pharmaceuticals', function (Blueprint $table) {
            $table->id();
            $table->string('generic_name', 255);
            $table->string('brand_name', 255);
            $table->string('dosage_form', 50)->default('Tablet');
            $table->string('strength', 100);
            $table->string('manufacturer', 150)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['brand_name', 'generic_name'], 'pharma_search_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pharmaceuticals');
    }
};
