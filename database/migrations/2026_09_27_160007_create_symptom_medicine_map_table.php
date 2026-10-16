<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('symptom_medicine_map', function (Blueprint $table) {
            $table->id();
            $table->foreignId('symptom_id')->constrained('symptoms');
            $table->foreignId('medicine_id')->constrained('medicines');
            $table->integer('priority')->default(1);
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('symptom_medicine_map');
    }
};
