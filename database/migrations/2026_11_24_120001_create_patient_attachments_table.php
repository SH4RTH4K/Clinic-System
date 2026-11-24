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
        Schema::create('patient_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('visit_id')->nullable()->constrained('visits')->nullOnDelete();
            $table->string('title', 255);
            $table->string('category', 50)->default('lab_report');
            $table->string('file_path', 500);
            $table->string('file_name', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['patient_id', 'category'], 'patient_attachments_category_idx');
            $table->index('visit_id', 'patient_attachments_visit_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_attachments');
    }
};
