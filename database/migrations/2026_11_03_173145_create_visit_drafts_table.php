<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLE = 'visit_drafts';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable(self::TABLE)) {
            Schema::create(self::TABLE, function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->longText('payload');
                $table->timestamp('expires_at')->index();
                $table->timestamps();
            });
        }

        $this->assertExpectedSchema();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Visit drafts may contain unsubmitted clinical information and cannot be removed by migration rollback.'
        );
    }

    private function assertExpectedSchema(): void
    {
        $columns = collect(Schema::getColumns(self::TABLE))->keyBy('name');
        $requiredColumns = ['id', 'user_id', 'payload', 'expires_at', 'created_at', 'updated_at'];

        if ($columns->keys()->all() !== $requiredColumns) {
            throw new RuntimeException('The existing visit_drafts table has an incompatible column layout. Review it before retrying this migration.');
        }

        foreach (['id', 'user_id', 'payload', 'expires_at'] as $column) {
            if ($columns[$column]['nullable'] || $columns[$column]['default'] !== null) {
                throw new RuntimeException("The existing visit_drafts.{$column} column has incompatible nullability or default settings.");
            }
        }

        foreach (['created_at', 'updated_at'] as $column) {
            if (! $columns[$column]['nullable'] || ! in_array($columns[$column]['default'], [null, 'NULL'], true)) {
                throw new RuntimeException("The existing visit_drafts.{$column} column has incompatible nullability or default settings.");
            }
        }

        $indexes = collect(Schema::getIndexes(self::TABLE));
        $hasPrimaryKey = $indexes->contains(
            fn (array $index): bool => $index['primary'] && $index['columns'] === ['id']
        );
        $hasUniqueUser = $indexes->contains(
            fn (array $index): bool => $index['unique'] && $index['columns'] === ['user_id']
        );
        $hasExpiryIndex = $indexes->contains(
            fn (array $index): bool => ! $index['unique'] && $index['columns'] === ['expires_at']
        );

        if (! $hasPrimaryKey || ! $hasUniqueUser || ! $hasExpiryIndex) {
            throw new RuntimeException('The existing visit_drafts table is missing a required primary key or index. Review it before retrying this migration.');
        }

        $foreignKeys = collect(Schema::getForeignKeys(self::TABLE));
        $userForeignKey = $foreignKeys->first(fn (array $foreignKey): bool => $foreignKey['columns'] === ['user_id']);

        if ($userForeignKey === null
            || $userForeignKey['foreign_table'] !== 'users'
            || $userForeignKey['foreign_columns'] !== ['id']
            || strtolower((string) $userForeignKey['on_delete']) !== 'cascade') {
            throw new RuntimeException('The existing visit_drafts.user_id foreign key is incompatible. Review it before retrying this migration.');
        }
    }
};
