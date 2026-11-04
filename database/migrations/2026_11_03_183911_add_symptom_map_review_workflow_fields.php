<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $columns = [
            'review_status' => fn (Blueprint $table) => $table->string('review_status', 24)->default('pending_review')->after('is_approved')->index(),
            'source_title' => fn (Blueprint $table) => $table->string('source_title')->nullable()->after('note'),
            'source_author' => fn (Blueprint $table) => $table->string('source_author')->nullable()->after('source_title'),
            'source_edition' => fn (Blueprint $table) => $table->string('source_edition')->nullable()->after('source_author'),
            'source_page' => fn (Blueprint $table) => $table->string('source_page', 100)->nullable()->after('source_edition'),
            'source_url' => fn (Blueprint $table) => $table->string('source_url', 2048)->nullable()->after('source_page'),
            'review_note' => fn (Blueprint $table) => $table->text('review_note')->nullable()->after('source_url'),
            'reviewed_by' => fn (Blueprint $table) => $table->foreignId('reviewed_by')->nullable()->after('updated_by')->constrained('users')->nullOnDelete(),
            'reviewer_name' => fn (Blueprint $table) => $table->string('reviewer_name')->nullable()->after('reviewed_by'),
            'reviewed_at' => fn (Blueprint $table) => $table->timestamp('reviewed_at')->nullable()->after('reviewed_by'),
        ];

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn('symptom_medicine_map', $column)) {
                Schema::table('symptom_medicine_map', $definition);
            }
        }

        $hasReviewStatusIndex = collect(Schema::getIndexes('symptom_medicine_map'))
            ->contains(fn (array $index): bool => $index['columns'] === ['review_status']);

        if (! $hasReviewStatusIndex) {
            Schema::table('symptom_medicine_map', function (Blueprint $table): void {
                $table->index('review_status');
            });
        }

        DB::table('symptom_medicine_map')->where('is_approved', false)->update(['review_status' => 'draft']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Symptom Map review decisions and source provenance are protected clinical history and cannot be removed by rollback.'
        );
    }
};
