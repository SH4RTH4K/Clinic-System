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
        if (! Schema::hasColumn('symptom_medicine_map', 'is_approved')) {
            Schema::table('symptom_medicine_map', function (Blueprint $table): void {
                $table->boolean('is_approved')->default(true)->after('note');
            });
        }

        if (! Schema::hasColumn('symptom_medicine_map', 'updated_by')) {
            Schema::table('symptom_medicine_map', function (Blueprint $table): void {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Symptom Map approval and update history are protected and cannot be removed by rollback.'
        );
    }
};
