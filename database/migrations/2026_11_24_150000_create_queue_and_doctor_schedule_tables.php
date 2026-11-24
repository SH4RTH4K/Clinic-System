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
        // 1. Doctor Schedules Table
        Schema::create('doctor_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->tinyInteger('day_of_week')->comment('0 = Sunday, 1 = Monday, ..., 6 = Saturday');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('chamber_no', 100)->nullable();
            $table->unsignedSmallInteger('slot_duration_minutes')->default(15);
            $table->unsignedSmallInteger('max_patients')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['doctor_id', 'day_of_week', 'is_active'], 'doc_sched_active_idx');
        });

        // 2. Doctor Leaves / Holidays Table
        Schema::create('doctor_leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->date('leave_date');
            $table->string('reason', 255)->nullable();
            $table->timestamps();

            $table->unique(['doctor_id', 'leave_date'], 'doc_leave_unique');
            $table->index(['leave_date'], 'doc_leave_date_idx');
        });

        // 3. Patient Queue Tokens Table
        Schema::create('patient_queue_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('token_number');
            $table->string('token_code', 30);
            $table->date('token_date');
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->string('patient_name', 255);
            $table->string('patient_phone', 50)->nullable();
            $table->foreignId('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->string('service_room', 100)->nullable();
            $table->enum('priority', ['normal', 'urgent'])->default('normal');
            $table->enum('status', ['waiting', 'calling', 'in_consultation', 'completed', 'skipped', 'cancelled'])->default('waiting');
            $table->timestamp('called_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('visit_id')->nullable()->constrained('visits')->nullOnDelete();
            $table->foreignId('appointment_request_id')->nullable()->constrained('appointment_requests')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['token_date', 'status'], 'pqt_date_status_idx');
            $table->index(['doctor_id', 'token_date', 'status'], 'pqt_doctor_date_status_idx');
            $table->index(['token_date', 'token_number'], 'pqt_date_number_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_queue_tokens');
        Schema::dropIfExists('doctor_leaves');
        Schema::dropIfExists('doctor_schedules');
    }
};
