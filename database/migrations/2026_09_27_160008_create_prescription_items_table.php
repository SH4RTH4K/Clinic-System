<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->constrained('visits');
            $table->foreignId('medicine_id')->constrained('medicines');
            $table->integer('sort_order')->default(0);
            $table->json('timing');
            $table->enum('before_after', ['before', 'after']);
            $table->integer('dose_qty');
            $table->enum('dose_unit', ['drops', 'pills']);
            $table->string('dilution_note')->default('with half a cup of water');
            $table->integer('duration_days')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
    }
};
