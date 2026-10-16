<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visit_food_restriction', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->constrained('visits');
            $table->foreignId('food_restriction_id')->constrained('food_restrictions');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visit_food_restriction');
    }
};
