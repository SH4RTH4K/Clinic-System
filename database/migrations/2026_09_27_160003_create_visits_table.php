<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            $table->date('visit_date');
            $table->integer('age_at_visit')->nullable();
            $table->text('chief_complaint');
            $table->text('bp_symptoms_notes')->nullable();
            $table->text('diagnosis_notes')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->enum('status', ['draft', 'finalized'])->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
