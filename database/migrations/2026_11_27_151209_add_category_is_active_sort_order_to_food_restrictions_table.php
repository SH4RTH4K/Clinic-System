<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('food_restrictions', function (Blueprint $table) {
            $table->string('text_en')->nullable()->change();
            $table->string('category', 50)->default('general')->after('is_default');
            $table->boolean('is_active')->default(true)->after('category');
            $table->unsignedInteger('sort_order')->default(0)->after('is_active');

            $table->index('category');
            $table->index('is_active');
            $table->index('is_default');
        });
    }

    public function down(): void
    {
        Schema::table('food_restrictions', function (Blueprint $table) {
            $table->dropIndex(['category']);
            $table->dropIndex(['is_active']);
            $table->dropIndex(['is_default']);

            $table->dropColumn(['category', 'is_active', 'sort_order']);
        });
    }
};
