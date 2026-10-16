<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->string('hero_title_1')->nullable();
            $table->string('hero_title_2')->nullable();
            $table->string('hero_title_3')->nullable();
            $table->string('hero_subtitle')->nullable();
            $table->text('hero_description')->nullable();
            $table->string('social_facebook')->nullable();
            $table->string('social_twitter')->nullable();
            $table->string('social_youtube')->nullable();
            $table->string('social_instagram')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->dropColumn([
                'hero_title_1',
                'hero_title_2',
                'hero_title_3',
                'hero_subtitle',
                'hero_description',
                'social_facebook',
                'social_twitter',
                'social_youtube',
                'social_instagram',
            ]);
        });
    }
};
