<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->integer('patient_no');
            $table->char('patient_series', 1);
            $table->string('name');
            $table->string('guardian_name')->nullable();
            $table->enum('gender', ['male', 'female', 'other']);
            $table->integer('age_years')->nullable();
            $table->date('dob')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('blood_group')->nullable();
            $table->text('known_allergies')->nullable();
            $table->string('referred_by')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['patient_no', 'patient_series']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
