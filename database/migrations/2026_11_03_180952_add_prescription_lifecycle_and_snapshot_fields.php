<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * The migration is restartable after MySQL commits schema changes separately.
     * SQLite also needs to run schema rebuilds outside an enclosing transaction.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        $this->addMissingVisitColumns();
        $this->addMissingPrescriptionItemColumns();
        $this->ensureCancellationForeignKey();
        $this->backfillNullPrescriptionStatuses();
        $this->ensurePrescriptionStatusDefault();

        $reviewSummary = $this->backfillMissingPrescriptionSnapshots();

        if ($reviewSummary['count'] > 0) {
            Log::warning('Legacy prescription items were snapshotted with uncertainty and require clinical review.', [
                'item_count' => $reviewSummary['count'],
                'item_ids_sample' => $reviewSummary['ids'],
                'reasons' => $reviewSummary['reasons'],
            ]);
        }

        DB::table('permissions')->insertOrIgnore([
            'name' => 'visits.cancel',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Prescription snapshots and lifecycle history are protected clinical records and cannot be removed by rollback.'
        );
    }

    private function addMissingVisitColumns(): void
    {
        if (! Schema::hasColumn('visits', 'prescription_status')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->string('prescription_status', 20)->nullable()->after('status');
            });
        }

        if (! Schema::hasColumn('visits', 'cancelled_by')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->foreignId('cancelled_by')->nullable()->after('finalized_at');
            });
        }

        if (! Schema::hasColumn('visits', 'cancelled_at')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->timestamp('cancelled_at')->nullable()->after('cancelled_by');
            });
        }

        if (! Schema::hasColumn('visits', 'prescriber_snapshot')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->json('prescriber_snapshot')->nullable()->after('cancelled_at');
            });
        }

        if (! Schema::hasColumn('visits', 'prescription_authorizer_snapshot')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->json('prescription_authorizer_snapshot')->nullable()->after('prescriber_snapshot');
            });
        }

        if (! Schema::hasColumn('visits', 'patient_snapshot')) {
            Schema::table('visits', function (Blueprint $table): void {
                $table->json('patient_snapshot')->nullable()->after('prescription_authorizer_snapshot');
            });
        }
    }

    private function addMissingPrescriptionItemColumns(): void
    {
        if (! Schema::hasColumn('prescription_items', 'prescription_version')) {
            Schema::table('prescription_items', function (Blueprint $table): void {
                $table->unsignedInteger('prescription_version')->nullable()->after('visit_id');
            });
        }

        if (! Schema::hasColumn('prescription_items', 'prescription_snapshot')) {
            Schema::table('prescription_items', function (Blueprint $table): void {
                $table->json('prescription_snapshot')->nullable()->after('duration_days');
            });
        }
    }

    private function ensureCancellationForeignKey(): void
    {
        $foreignKeys = Schema::getForeignKeys('visits');
        $columnForeignKey = collect($foreignKeys)->first(
            fn (array $foreignKey): bool => $foreignKey['columns'] === ['cancelled_by']
        );

        if ($columnForeignKey !== null) {
            if ($columnForeignKey['foreign_table'] !== 'users' || $columnForeignKey['foreign_columns'] !== ['id']) {
                throw new RuntimeException('The visits.cancelled_by foreign key conflicts with the expected users relationship.');
            }

            return;
        }

        $orphanedVisitId = DB::table('visits as visits')
            ->leftJoin('users', 'users.id', '=', 'visits.cancelled_by')
            ->whereNotNull('visits.cancelled_by')
            ->whereNull('users.id')
            ->orderBy('visits.id')
            ->value('visits.id');

        if ($orphanedVisitId !== null) {
            throw new RuntimeException(
                "Visit {$orphanedVisitId} has a cancelled_by reference that must be reviewed before adding the foreign key."
            );
        }

        Schema::table('visits', function (Blueprint $table): void {
            $table->foreign('cancelled_by')->references('id')->on('users');
        });
    }

    private function backfillNullPrescriptionStatuses(): void
    {
        DB::table('visits')
            ->select(['id', 'status'])
            ->whereNull('prescription_status')
            ->orderBy('id')
            ->chunkById(250, function ($visits): void {
                foreach ($visits as $visit) {
                    DB::table('visits')
                        ->where('id', $visit->id)
                        ->whereNull('prescription_status')
                        ->update([
                            'prescription_status' => $visit->status === 'draft' ? 'draft' : 'legacy_unverified',
                        ]);
                }
            });
    }

    private function ensurePrescriptionStatusDefault(): void
    {
        $statusColumn = collect(Schema::getColumns('visits'))
            ->firstWhere('name', 'prescription_status');

        if ($statusColumn === null) {
            throw new RuntimeException('The prescription_status column could not be verified.');
        }

        $default = is_string($statusColumn['default'])
            ? trim($statusColumn['default'], "'\"")
            : $statusColumn['default'];

        if (! $statusColumn['nullable'] && $default === 'draft') {
            return;
        }

        Schema::table('visits', function (Blueprint $table) use ($statusColumn): void {
            $column = $table->string('prescription_status', 20)
                ->default('draft')
                ->nullable(false);

            if ($statusColumn['collation'] !== null) {
                $column->collation($statusColumn['collation']);
            }

            $column->change();
        });
    }

    /**
     * @return array{count: int, ids: list<int>, reasons: array<string, int>}
     */
    private function backfillMissingPrescriptionSnapshots(): array
    {
        $reviewSummary = [
            'count' => 0,
            'ids' => [],
            'reasons' => [],
        ];

        DB::table('prescription_items')
            ->leftJoin('medicines', 'medicines.id', '=', 'prescription_items.medicine_id')
            ->select([
                'prescription_items.id',
                'prescription_items.visit_id',
                'prescription_items.medicine_id',
                'prescription_items.timing',
                'prescription_items.before_after',
                'prescription_items.dose_qty',
                'prescription_items.dose_unit',
                'prescription_items.dilution_note',
                'prescription_items.duration_days',
                'prescription_items.created_at',
                'prescription_items.deleted_at',
                'medicines.id as available_medicine_id',
            ])
            ->whereNull('prescription_items.prescription_snapshot')
            ->orderBy('prescription_items.id')
            ->chunkById(250, function ($items) use (&$reviewSummary): void {
                foreach ($items as $item) {
                    $timing = $this->parseLegacyTiming($item->timing);
                    $reasons = [
                        'point_in_time_medicine_details_not_recorded',
                        'prescriber_authorization_not_recorded_on_item',
                    ];

                    if ($item->medicine_id === null) {
                        $reasons[] = 'medicine_id_missing_from_source';
                    } elseif ($item->available_medicine_id === null) {
                        $reasons[] = 'medicine_catalog_record_unavailable';
                    }

                    if ($timing['reason'] !== null) {
                        $reasons[] = $timing['reason'];
                    }

                    $snapshot = [
                        'medicine_id' => $item->medicine_id,
                        'medicine_name' => null,
                        'potency' => null,
                        'formulation' => null,
                        'catalog_instruction' => null,
                        'authorizer' => null,
                        'directions' => [
                            'timing' => $timing['value'],
                            'before_after' => $item->before_after,
                            'dose_qty' => $item->dose_qty,
                            'dose_unit' => $item->dose_unit,
                            'dilution_note' => $item->dilution_note,
                            'duration_days' => $item->duration_days,
                        ],
                        'source_record' => [
                            'prescription_item_id' => (int) $item->id,
                            'visit_id' => (int) $item->visit_id,
                            'created_at' => $item->created_at,
                            'deleted_at' => $item->deleted_at,
                        ],
                        'provenance' => [
                            'kind' => 'legacy_backfill',
                            'status' => 'manual_review_required',
                            'reasons' => array_values(array_unique($reasons)),
                        ],
                    ];

                    if ($timing['raw'] !== null) {
                        $snapshot['directions']['timing_source_raw'] = $timing['raw'];
                    }

                    try {
                        $snapshotJson = json_encode($snapshot, JSON_THROW_ON_ERROR);
                    } catch (JsonException) {
                        $this->recordReviewIssue($reviewSummary, (int) $item->id, 'snapshot_encoding_failed');

                        continue;
                    }

                    DB::table('prescription_items')
                        ->where('id', $item->id)
                        ->whereNull('prescription_snapshot')
                        ->update(['prescription_snapshot' => $snapshotJson]);

                    foreach (array_unique($reasons) as $reason) {
                        $reviewSummary['reasons'][$reason] = ($reviewSummary['reasons'][$reason] ?? 0) + 1;
                    }
                    $reviewSummary['count']++;

                    if (count($reviewSummary['ids']) < 100) {
                        $reviewSummary['ids'][] = (int) $item->id;
                    }
                }
            }, 'prescription_items.id', 'id');

        return $reviewSummary;
    }

    /**
     * @return array{value: list<mixed>|null, raw: string|null, reason: string|null}
     */
    private function parseLegacyTiming(mixed $timing): array
    {
        if ($timing === null) {
            return ['value' => null, 'raw' => null, 'reason' => 'timing_missing_from_source'];
        }

        try {
            $decoded = json_decode((string) $timing, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return ['value' => null, 'raw' => (string) $timing, 'reason' => 'timing_json_invalid'];
        }

        if (! is_array($decoded) || ! array_is_list($decoded)) {
            return ['value' => null, 'raw' => (string) $timing, 'reason' => 'timing_json_not_a_list'];
        }

        return [
            'value' => $decoded,
            'raw' => null,
            'reason' => $decoded === [] ? 'timing_list_empty' : null,
        ];
    }

    /**
     * @param  array{count: int, ids: list<int>, reasons: array<string, int>}  $summary
     */
    private function recordReviewIssue(array &$summary, int $itemId, string $reason): void
    {
        $summary['count']++;
        $summary['reasons'][$reason] = ($summary['reasons'][$reason] ?? 0) + 1;

        if (count($summary['ids']) < 100) {
            $summary['ids'][] = $itemId;
        }
    }
};
