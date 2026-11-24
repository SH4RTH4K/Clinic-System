<?php

namespace App\Services;

use App\Models\MedicineBatch;
use App\Models\StockTransaction;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    /**
     * Receive new stock batch and record the intake transaction.
     *
     * @param  array<string, mixed>  $data
     */
    public function receiveStock(array $data, ?User $user = null): MedicineBatch
    {
        return DB::transaction(function () use ($data, $user): MedicineBatch {
            $initialQty = (float) ($data['initial_quantity'] ?? 0.0);
            $data['current_quantity'] = $initialQty;

            $batch = MedicineBatch::create($data);

            StockTransaction::create([
                'medicine_batch_id' => $batch->id,
                'transaction_type' => 'purchase',
                'quantity' => $initialQty,
                'balance_after' => $initialQty,
                'reference_number' => $data['purchase_invoice'] ?? null,
                'performed_by' => $user?->id,
                'notes' => 'Initial stock receipt: '.($data['supplier_name'] ?? 'Supplier'),
            ]);

            return $batch;
        });
    }

    /**
     * Manually adjust stock (restock, correction, damage/wastage, return).
     */
    public function adjustStock(
        MedicineBatch $batch,
        float $newQuantity,
        string $reason,
        string $type,
        ?User $user = null,
        ?string $referenceNumber = null
    ): StockTransaction {
        return DB::transaction(function () use ($batch, $newQuantity, $reason, $type, $user, $referenceNumber): StockTransaction {
            $batch->lockForUpdate();
            $oldQuantity = (float) $batch->current_quantity;
            $delta = $newQuantity - $oldQuantity;

            $batch->update([
                'current_quantity' => $newQuantity,
            ]);

            return StockTransaction::create([
                'medicine_batch_id' => $batch->id,
                'transaction_type' => $type,
                'quantity' => $delta,
                'balance_after' => $newQuantity,
                'reference_number' => $referenceNumber,
                'performed_by' => $user?->id,
                'notes' => $reason,
            ]);
        });
    }

    /**
     * Deduct inventory for items in a finalized prescription visit.
     *
     * @return array{dispensed_count: int, out_of_stock_count: int, log: list<string>}
     */
    public function deductForPrescription(Visit $visit, ?User $user = null): array
    {
        $dispensedCount = 0;
        $outOfStockCount = 0;
        $logs = [];

        $prescriptionItems = $visit->prescriptionItems()->get();

        foreach ($prescriptionItems as $item) {
            $batch = null;

            if ($item->item_type === 'remedy' && $item->medicine_id) {
                $query = MedicineBatch::query()
                    ->where('item_type', 'remedy')
                    ->where('medicine_id', $item->medicine_id)
                    ->where('is_active', true)
                    ->where('current_quantity', '>', 0);

                if (! empty($item->potency)) {
                    $potencyMatch = (clone $query)->where('potency', $item->potency)->orderBy('expiry_date')->first();
                    if ($potencyMatch) {
                        $batch = $potencyMatch;
                    }
                }

                if (! $batch) {
                    $batch = $query->orderBy('expiry_date')->first();
                }
            } elseif ($item->item_type === 'pharmaceutical' && $item->pharmaceutical_id) {
                $batch = MedicineBatch::query()
                    ->where('item_type', 'pharmaceutical')
                    ->where('pharmaceutical_id', $item->pharmaceutical_id)
                    ->where('is_active', true)
                    ->where('current_quantity', '>', 0)
                    ->orderBy('expiry_date')
                    ->first();
            }

            if ($batch) {
                $batch->lockForUpdate();
                $deductQty = 1.0; // standard 1 packaging unit per prescription item
                $newQty = max(0.0, (float) $batch->current_quantity - $deductQty);

                $batch->update(['current_quantity' => $newQty]);

                StockTransaction::create([
                    'medicine_batch_id' => $batch->id,
                    'transaction_type' => 'dispense',
                    'quantity' => -$deductQty,
                    'balance_after' => $newQty,
                    'visit_id' => $visit->id,
                    'prescription_item_id' => $item->id,
                    'reference_number' => 'VISIT-'.$visit->id,
                    'performed_by' => $user?->id,
                    'notes' => 'Prescription auto-deduction for Patient: '.($visit->patient?->name ?? 'Patient'),
                ]);

                $dispensedCount++;
                $logs[] = "Dispensed 1 {$batch->unit} of {$batch->item_name} (Batch: {$batch->batch_number}). New stock: {$newQty}";
            } else {
                $outOfStockCount++;
                $itemName = $item->brand_name ?: ($item->medicine?->name ?: ($item->generic_name ?: 'Prescribed item'));
                $logs[] = "No active stock available for {$itemName}. Skipped deduction.";
            }
        }

        return [
            'dispensed_count' => $dispensedCount,
            'out_of_stock_count' => $outOfStockCount,
            'log' => $logs,
        ];
    }

    /**
     * Compute dashboard & inventory overview metrics.
     *
     * @return array<string, mixed>
     */
    public function getDashboardMetrics(): array
    {
        $activeBatches = MedicineBatch::active();

        $totalBatches = (clone $activeBatches)->count();
        $remedyBatches = (clone $activeBatches)->remedies()->count();
        $pharmaBatches = (clone $activeBatches)->pharmaceuticals()->count();

        $totalPurchaseValue = (float) (clone $activeBatches)->selectRaw('SUM(current_quantity * purchase_price) as total')->value('total') ?: 0.0;
        $totalSellingValue = (float) (clone $activeBatches)->selectRaw('SUM(current_quantity * selling_price) as total')->value('total') ?: 0.0;

        $lowStockCount = (clone $activeBatches)->lowStock()->count();
        $expiringCount = (clone $activeBatches)->expiringSoon(30)->count();
        $expiredCount = (clone $activeBatches)->expired()->count();
        $outOfStockCount = (clone $activeBatches)->where('current_quantity', '<=', 0)->count();

        $expiringItems = (clone $activeBatches)
            ->expiringSoon(30)
            ->with(['medicine:id,name', 'pharmaceutical:id,brand_name,generic_name,strength'])
            ->orderBy('expiry_date')
            ->limit(5)
            ->get();

        $lowStockItems = (clone $activeBatches)
            ->lowStock()
            ->with(['medicine:id,name', 'pharmaceutical:id,brand_name,generic_name,strength'])
            ->orderBy('current_quantity')
            ->limit(5)
            ->get();

        return [
            'total_batches' => $totalBatches,
            'remedy_batches' => $remedyBatches,
            'pharmaceutical_batches' => $pharmaBatches,
            'total_purchase_value' => round($totalPurchaseValue, 2),
            'total_selling_value' => round($totalSellingValue, 2),
            'low_stock_count' => $lowStockCount,
            'expiring_count' => $expiringCount,
            'expired_count' => $expiredCount,
            'out_of_stock_count' => $outOfStockCount,
            'expiring_items' => $expiringItems,
            'low_stock_items' => $lowStockItems,
        ];
    }
}
