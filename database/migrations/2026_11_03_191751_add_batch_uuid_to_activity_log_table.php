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
        if (! Schema::hasColumn('activity_log', 'batch_uuid')) {
            Schema::table('activity_log', function (Blueprint $table): void {
                $table->uuid('batch_uuid')->nullable();
            });
        }

        $hasBatchUuidIndex = collect(Schema::getIndexes('activity_log'))
            ->contains(fn (array $index): bool => $index['columns'] === ['batch_uuid']);

        if (! $hasBatchUuidIndex) {
            Schema::table('activity_log', function (Blueprint $table): void {
                $table->index('batch_uuid');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Audit log batch metadata is protected and cannot be removed by rollback.'
        );
    }
};
