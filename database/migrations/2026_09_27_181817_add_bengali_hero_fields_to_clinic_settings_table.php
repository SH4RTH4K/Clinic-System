<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->string('hero_title_1_bn')->nullable();
            $table->string('hero_title_2_bn')->nullable();
            $table->string('hero_title_3_bn')->nullable();
            $table->string('hero_subtitle_bn')->nullable();
            $table->text('hero_description_bn')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->dropColumn([
                'hero_title_1_bn',
                'hero_title_2_bn',
                'hero_title_3_bn',
                'hero_subtitle_bn',
                'hero_description_bn',
            ]);
        });
    }
};
