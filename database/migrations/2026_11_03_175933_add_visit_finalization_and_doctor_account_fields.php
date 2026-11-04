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
        if (! Schema::hasColumn('doctors', 'user_id')) {
            Schema::table('doctors', function (Blueprint $table): void {
                $table->foreignId('user_id')->nullable()->unique()->after('id')->constrained()->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('visits', 'finalized_by')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->foreignId('finalized_by')->nullable()->after('status')->constrained('users');
            });
        }

        if (! Schema::hasColumn('visits', 'finalized_at')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->timestamp('finalized_at')->nullable()->after('finalized_by');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Visit finalization evidence and doctor account associations are protected and cannot be removed by rollback.'
        );
    }
};
