<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use JsonException;

class VerifyPrescriptionHistory extends Command
{
    protected $signature = 'prescriptions:verify-history {--limit=100 : Maximum record IDs to show for each finding}';

    protected $description = 'Read-only check of prescription snapshot and lifecycle integrity';

    /** @var array<string, array{count: int, ids: list<int>}> */
    private array $findings = [];

    private int $sampleLimit = 100;

    public function handle(): int
    {
        $this->sampleLimit = max(1, min(1000, (int) $this->option('limit')));

        if (! $this->schemaIsReady()) {
            $this->error('Prescription lifecycle schema is incomplete. Apply the reviewed migration before verification.');

            return self::FAILURE;
        }

        $this->inspectPrescriptionItems();
        $this->inspectPrescriptionAmendments();
        $this->inspectVisitLifecycle();

        $this->info('Read-only prescription history verification completed.');

        foreach ($this->findings as $finding => $result) {
            $sampleIds = implode(', ', $result['ids']);
            $sampleSuffix = $result['count'] > count($result['ids']) ? ', …' : '';
            $this->line(sprintf(
                '%s: %d record(s)%s',
                $finding,
                $result['count'],
                $sampleIds === '' ? '' : "; IDs: {$sampleIds}{$sampleSuffix}"
            ));
        }

        $blockingFindings = array_intersect_key($this->findings, array_flip([
            'missing_snapshot',
            'invalid_snapshot_json',
            'invalid_timing_json',
            'missing_timing',
        ]));

        if ($blockingFindings !== []) {
            $this->error('Some records need repair or manual review before the release can be reopened.');

            return self::FAILURE;
        }

        if ($this->findings !== []) {
            $this->warn('Unverified records are reported for review. Their prescription PDFs remain blocked until an authorized prescriber records a reviewed version.');
        } else {
            $this->comment('No prescription history integrity findings were detected.');
        }

        return self::SUCCESS;
    }

    private function schemaIsReady(): bool
    {
        foreach (['visits', 'prescription_items', 'medicines', 'visit_amendments'] as $table) {
            if (! Schema::hasTable($table)) {
                return false;
            }
        }

        return Schema::hasColumns('visits', [
            'status', 'prescription_status', 'finalized_by', 'finalized_at',
            'cancelled_by', 'cancelled_at', 'prescriber_snapshot',
            'prescription_authorizer_snapshot', 'patient_snapshot',
        ]) && Schema::hasColumns('prescription_items', [
            'id', 'visit_id', 'medicine_id', 'timing', 'prescription_version',
            'prescription_snapshot', 'deleted_at',
        ]);
    }

    private function inspectPrescriptionItems(): void
    {
        DB::table('prescription_items as items')
            ->leftJoin('medicines', 'medicines.id', '=', 'items.medicine_id')
            ->select([
                'items.id',
                'items.visit_id',
                'items.medicine_id',
                'items.timing',
                'items.prescription_version',
                'items.prescription_snapshot',
                'items.deleted_at',
                'medicines.id as available_medicine_id',
            ])
            ->orderBy('items.id')
            ->chunkById(250, function ($items): void {
                foreach ($items as $item) {
                    if ($item->prescription_snapshot === null) {
                        $this->recordFinding('missing_snapshot', (int) $item->id);
                    } else {
                        $this->inspectSnapshot($item);
                    }

                    if ($item->timing === null) {
                        $this->recordFinding('missing_timing', (int) $item->id);
                    } elseif (! $this->timingIsValid($item->timing)) {
                        $this->recordFinding('invalid_timing_json', (int) $item->id);
                    }

                    if ($item->medicine_id === null || $item->available_medicine_id === null) {
                        $this->recordFinding('medicine_reference_unavailable', (int) $item->id);
                    }

                    if ($item->prescription_version === null || (int) $item->prescription_version < 1) {
                        $this->recordFinding('version_order_unverifiable', (int) $item->id);
                    }
                }
            }, 'items.id', 'id');
    }

    private function inspectSnapshot(object $item): void
    {
        try {
            $snapshot = json_decode((string) $item->prescription_snapshot, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $this->recordFinding('invalid_snapshot_json', (int) $item->id);

            return;
        }

        if (! is_array($snapshot)) {
            $this->recordFinding('invalid_snapshot_shape', (int) $item->id);

            return;
        }

        $provenance = $snapshot['provenance'] ?? null;

        if (! is_array($provenance)
            || ($provenance['kind'] ?? null) !== 'prescriber_authorized_capture'
            || ($provenance['status'] ?? null) !== 'captured_at_authorization') {
            $this->recordFinding('snapshot_unverified', (int) $item->id);
        }

        if (($provenance['status'] ?? null) === 'manual_review_required') {
            $this->recordFinding('snapshot_requires_manual_review', (int) $item->id);
        }

        if (array_key_exists('medicine_id', $snapshot)
            && $snapshot['medicine_id'] !== null
            && $item->medicine_id !== null
            && (string) $snapshot['medicine_id'] !== (string) $item->medicine_id) {
            $this->recordFinding('snapshot_medicine_id_mismatch', (int) $item->id);
        }

        if ($item->deleted_at !== null && ($provenance['status'] ?? null) !== 'captured_at_authorization') {
            $this->recordFinding('soft_deleted_snapshot_unverified', (int) $item->id);
        }
    }

    private function inspectPrescriptionAmendments(): void
    {
        $amendmentCounts = [];

        DB::table('visit_amendments')
            ->select(['id', 'visit_id', 'changed_fields'])
            ->orderBy('id')
            ->chunkById(250, function ($amendments) use (&$amendmentCounts): void {
                foreach ($amendments as $amendment) {
                    try {
                        $changedFields = json_decode((string) $amendment->changed_fields, true, flags: JSON_THROW_ON_ERROR);
                    } catch (JsonException) {
                        $this->recordFinding('invalid_amendment_history', (int) $amendment->id);

                        continue;
                    }

                    if (! is_array($changedFields)) {
                        $this->recordFinding('invalid_amendment_history', (int) $amendment->id);
                    } elseif (in_array('prescription_items', $changedFields, true)) {
                        $visitId = (int) $amendment->visit_id;
                        $amendmentCounts[$visitId] = ($amendmentCounts[$visitId] ?? 0) + 1;
                    }
                }
            });

        foreach (array_chunk(array_keys($amendmentCounts), 250) as $visitIds) {
            $versionGroups = DB::table('prescription_items')
                ->select('visit_id')
                ->selectRaw('MAX(prescription_version) as highest_version')
                ->selectRaw('COUNT(DISTINCT prescription_version) as version_count')
                ->whereIn('visit_id', $visitIds)
                ->groupBy('visit_id')
                ->get()
                ->keyBy('visit_id');

            foreach ($visitIds as $visitId) {
                $requiredVersionCount = $amendmentCounts[$visitId] + 1;
                $versionGroup = $versionGroups[$visitId] ?? null;

                if ($versionGroup === null || (int) $versionGroup->highest_version < $requiredVersionCount) {
                    $this->recordFinding('amendment_order_unverifiable', $visitId);
                }

                if ($versionGroup !== null
                    && (int) $versionGroup->highest_version > (int) $versionGroup->version_count) {
                    $this->recordFinding('prescription_version_sequence_gap', $visitId);
                }
            }
        }
    }

    private function inspectVisitLifecycle(): void
    {
        DB::table('visits')
            ->select([
                'id',
                'status',
                'prescription_status',
                'finalized_by',
                'finalized_at',
                'cancelled_by',
                'cancelled_at',
            ])
            ->orderBy('id')
            ->chunkById(250, function ($visits): void {
                foreach ($visits as $visit) {
                    if ($visit->prescription_status === null || $visit->prescription_status === 'legacy_unverified') {
                        $this->recordFinding('lifecycle_state_unverified', (int) $visit->id);
                    }

                    if ($visit->status === 'finalized'
                        && in_array($visit->prescription_status, ['draft', 'legacy_unverified'], true)) {
                        $this->recordFinding('finalized_visit_prescription_state_mismatch', (int) $visit->id);
                    }

                    if ($visit->prescription_status === 'cancelled'
                        && ($visit->cancelled_by === null || $visit->cancelled_at === null)) {
                        $this->recordFinding('cancellation_audit_incomplete', (int) $visit->id);
                    }

                    if (in_array($visit->prescription_status, ['finalized', 'amended'], true)
                        && ($visit->finalized_by === null || $visit->finalized_at === null)) {
                        $this->recordFinding('finalization_provenance_incomplete', (int) $visit->id);
                    }
                }
            });
    }

    private function timingIsValid(mixed $timing): bool
    {
        try {
            $decoded = json_decode((string) $timing, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return false;
        }

        return is_array($decoded) && array_is_list($decoded);
    }

    private function recordFinding(string $finding, int $recordId): void
    {
        $this->findings[$finding] ??= ['count' => 0, 'ids' => []];
        $this->findings[$finding]['count']++;

        if (count($this->findings[$finding]['ids']) < $this->sampleLimit) {
            $this->findings[$finding]['ids'][] = $recordId;
        }
    }
}
