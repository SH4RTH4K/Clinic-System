<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinic_settings', function (Blueprint $table) {
            $table->id();
            $table->string('clinic_name_en');
            $table->string('clinic_name_bn')->nullable();
            $table->string('doctor_name');
            $table->string('doctor_credentials');
            $table->string('govt_reg_no')->nullable();
            $table->text('address');
            $table->string('phone');
            $table->string('bkash_number')->nullable();
            $table->string('visiting_hours')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('doctor_photo_path')->nullable();
            $table->char('patient_no_series', 1)->default('A');
            $table->integer('patient_no_next')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_settings');
    }
};
