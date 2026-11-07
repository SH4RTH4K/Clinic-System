<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('appointment_requests')) {
            throw new RuntimeException('The appointment_requests table is missing; staff scheduling cannot be installed safely.');
        }

        Schema::table('appointment_requests', function (Blueprint $table): void {
            if (! Schema::hasColumn('appointment_requests', 'source')) {
                $table->string('source', 20)->default('website');
            }

            if (! Schema::hasColumn('appointment_requests', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('appointment_requests', 'scheduled_date')) {
                $table->date('scheduled_date')->nullable();
            }

            if (! Schema::hasColumn('appointment_requests', 'scheduled_time')) {
                $table->time('scheduled_time')->nullable();
            }
        });

        $this->ensureCreatorForeignKey();

        if (! Schema::hasTable('appointment_request_events')) {
            Schema::create('appointment_request_events', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('appointment_request_id');
                $table->foreignId('performed_by')->nullable();
                $table->string('performed_by_name')->nullable();
                $table->string('event_type', 32);
                $table->string('previous_status', 20)->nullable();
                $table->string('new_status', 20)->nullable();
                $table->date('previous_scheduled_date')->nullable();
                $table->time('previous_scheduled_time')->nullable();
                $table->date('new_scheduled_date')->nullable();
                $table->time('new_scheduled_time')->nullable();
                $table->text('reason')->nullable();
                $table->timestamps();

                $table->foreign('appointment_request_id', 'appt_req_events_request_fk')
                    ->references('id')->on('appointment_requests')->restrictOnDelete();
                $table->foreign('performed_by', 'appt_req_events_performer_fk')
                    ->references('id')->on('users')->nullOnDelete();
                $table->index(['appointment_request_id', 'created_at'], 'appt_req_events_req_created_idx');
            });
        }

        $this->verifyEventTable();
    }

    public function down(): void
    {
        throw new RuntimeException('Appointment intake and scheduling history is forward-only to preserve its audit trail.');
    }

    private function ensureCreatorForeignKey(): void
    {
        $matchingForeignKeys = collect(Schema::getForeignKeys('appointment_requests'))
            ->filter(fn (array $foreignKey): bool => $foreignKey['columns'] === ['created_by']);

        if ($matchingForeignKeys->count() > 1) {
            throw new RuntimeException('Multiple appointment_requests.created_by foreign keys exist; manual review is required.');
        }

        $foreignKey = $matchingForeignKeys->first();

        if ($foreignKey !== null) {
            if ($foreignKey['foreign_table'] !== 'users'
                || $foreignKey['foreign_columns'] !== ['id']
                || strtolower((string) $foreignKey['on_delete']) !== 'set null') {
                throw new RuntimeException('The appointment_requests.created_by foreign key is incompatible; manual review is required.');
            }

            return;
        }

        $hasOrphans = DB::table('appointment_requests as requests')
            ->leftJoin('users', 'users.id', '=', 'requests.created_by')
            ->whereNotNull('requests.created_by')
            ->whereNull('users.id')
            ->exists();

        if ($hasOrphans) {
            throw new RuntimeException('Appointment request creator references are orphaned; no records were changed.');
        }

        Schema::table('appointment_requests', function (Blueprint $table): void {
            $table->foreign('created_by', 'appointment_requests_created_by_foreign')
                ->references('id')->on('users')->nullOnDelete();
        });
    }

    private function verifyEventTable(): void
    {
        $requiredColumns = [
            'id', 'appointment_request_id', 'performed_by', 'performed_by_name', 'event_type',
            'previous_status', 'new_status', 'previous_scheduled_date', 'previous_scheduled_time',
            'new_scheduled_date', 'new_scheduled_time', 'reason', 'created_at', 'updated_at',
        ];

        foreach ($requiredColumns as $column) {
            if (! Schema::hasColumn('appointment_request_events', $column)) {
                throw new RuntimeException("The appointment_request_events table is incomplete; missing {$column}.");
            }
        }

        $foreignKeys = collect(Schema::getForeignKeys('appointment_request_events'));
        $expectedForeignKeys = [
            ['column' => 'appointment_request_id', 'table' => 'appointment_requests', 'delete' => 'restrict'],
            ['column' => 'performed_by', 'table' => 'users', 'delete' => 'set null'],
        ];

        if ($foreignKeys->count() !== count($expectedForeignKeys)) {
            throw new RuntimeException('The appointment_request_events foreign-key structure is unexpected; manual review is required.');
        }

        foreach ($expectedForeignKeys as $expected) {
            $matches = $foreignKeys->filter(fn (array $foreignKey): bool => $foreignKey['columns'] === [$expected['column']]);
            $foreignKey = $matches->first();

            if ($matches->count() !== 1
                || $foreignKey['foreign_table'] !== $expected['table']
                || $foreignKey['foreign_columns'] !== ['id']
                || strtolower((string) $foreignKey['on_delete']) !== $expected['delete']) {
                throw new RuntimeException("The appointment_request_events.{$expected['column']} foreign key is incompatible; manual review is required.");
            }
        }

        $hasRequestHistoryIndex = collect(Schema::getIndexes('appointment_request_events'))
            ->contains(fn (array $index): bool => $index['columns'] === ['appointment_request_id', 'created_at']);

        if (! $hasRequestHistoryIndex) {
            throw new RuntimeException('The appointment_request_events history index is missing; manual review is required.');
        }
    }
};
