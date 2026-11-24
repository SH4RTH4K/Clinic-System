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
        Schema::create('lab_investigations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('category', 50)->default('other');
            $table->text('default_instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['category', 'name'], 'lab_investigations_search_idx');
        });

        Schema::create('visit_lab_investigations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->constrained('visits')->cascadeOnDelete();
            $table->foreignId('lab_investigation_id')->nullable()->constrained('lab_investigations')->nullOnDelete();
            $table->string('test_name', 255);
            $table->text('instructions')->nullable();
            $table->string('status', 30)->default('ordered');
            $table->timestamps();

            $table->index(['visit_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visit_lab_investigations');
        Schema::dropIfExists('lab_investigations');
    }
};
