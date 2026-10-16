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
        Schema::table('doctors', function (Blueprint $table) {
            $table->string('social_linkedin')->nullable();
            $table->string('social_whatsapp')->nullable();
            $table->string('social_tiktok')->nullable();
            $table->string('social_telegram')->nullable();
            $table->string('social_website')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropColumn([
                'social_linkedin',
                'social_whatsapp',
                'social_tiktok',
                'social_telegram',
                'social_website',
            ]);
        });
    }
};
