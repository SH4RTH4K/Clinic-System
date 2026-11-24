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
        // 1. Add share_token to visits table for secure public digital prescription view
        Schema::table('visits', function (Blueprint $table) {
            if (! Schema::hasColumn('visits', 'share_token')) {
                $table->string('share_token', 64)->nullable()->unique()->after('status');
            }
        });

        // 2. Add sms_config to clinic_settings
        Schema::table('clinic_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('clinic_settings', 'sms_config')) {
                $table->json('sms_config')->nullable()->after('prescription_config');
            }
        });

        // 3. Create patient_notifications table
        Schema::create('patient_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->enum('channel', ['sms', 'whatsapp'])->default('sms');
            $table->string('recipient_phone', 50);
            $table->string('event_type', 50)->default('custom_alert');
            $table->text('message_body');
            $table->enum('status', ['sent', 'failed', 'delivered', 'queued'])->default('sent');
            $table->string('gateway_provider', 50)->nullable();
            $table->text('gateway_response')->nullable();
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['patient_id', 'created_at'], 'pnotif_patient_date_idx');
            $table->index(['channel', 'status'], 'pnotif_channel_status_idx');
            $table->index(['recipient_phone'], 'pnotif_phone_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_notifications');

        Schema::table('clinic_settings', function (Blueprint $table) {
            if (Schema::hasColumn('clinic_settings', 'sms_config')) {
                $table->dropColumn('sms_config');
            }
        });

        Schema::table('visits', function (Blueprint $table) {
            if (Schema::hasColumn('visits', 'share_token')) {
                $table->dropColumn('share_token');
            }
        });
    }
};
