<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdjustStockRequest;
use App\Http\Requests\Admin\StoreMedicineBatchRequest;
use App\Http\Requests\Admin\UpdateMedicineBatchRequest;
use App\Models\Manufacturer;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Pharmaceutical;
use App\Models\StockTransaction;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $request, InventoryService $inventoryService)
    {
        $query = MedicineBatch::query()->with([
            'medicine:id,name',
            'pharmaceutical:id,brand_name,generic_name,strength,dosage_form',
        ]);

        if ($request->filled('type') && in_array($request->type, ['remedy', 'pharmaceutical'], true)) {
            $query->where('item_type', $request->type);
        }

        if ($request->filled('status')) {
            match ($request->status) {
                'low_stock' => $query->lowStock(),
                'expiring' => $query->expiringSoon(30),
                'expired' => $query->expired(),
                'out_of_stock' => $query->where('current_quantity', '<=', 0),
                default => null,
            };
        }

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term) {
                $q->where('batch_number', 'like', "%{$term}%")
                    ->orWhere('supplier_name', 'like', "%{$term}%")
                    ->orWhereHas('medicine', fn ($m) => $m->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('pharmaceutical', fn ($p) => $p->where('brand_name', 'like', "%{$term}%")->orWhere('generic_name', 'like', "%{$term}%"));
            });
        }

        $batches = $query->latest()
            ->paginate(15)
            ->withQueryString();

        $metrics = $inventoryService->getDashboardMetrics();

        return Inertia::render('Admin/Inventory/Index', [
            'batches' => $batches,
            'filters' => $request->only(['type', 'status', 'search']),
            'metrics' => $metrics,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Inventory/Create', [
            'medicines' => Medicine::query()->where('is_active', true)->select(['id', 'name', 'potency', 'form'])->orderBy('name')->get(),
            'pharmaceuticals' => Pharmaceutical::query()->where('is_active', true)->select(['id', 'brand_name', 'generic_name', 'strength', 'dosage_form', 'manufacturer'])->orderBy('brand_name')->get(),
            'manufacturers' => Manufacturer::active()->orderBy('name')->get(['id', 'name', 'short_name', 'type', 'phone']),
        ]);
    }

    public function store(StoreMedicineBatchRequest $request, InventoryService $inventoryService)
    {
        $inventoryService->receiveStock($request->validated(), $request->user());

        return redirect()->route('admin.inventory.index')->with('success', 'Medicine batch received and inventory updated.');
    }

    public function edit(MedicineBatch $batch)
    {
        $batch->load(['medicine:id,name,potency,form', 'pharmaceutical:id,brand_name,generic_name,strength,dosage_form,manufacturer']);

        return Inertia::render('Admin/Inventory/Edit', [
            'batch' => $batch,
            'medicines' => Medicine::query()->where('is_active', true)->select(['id', 'name', 'potency', 'form'])->orderBy('name')->get(),
            'pharmaceuticals' => Pharmaceutical::query()->where('is_active', true)->select(['id', 'brand_name', 'generic_name', 'strength', 'dosage_form', 'manufacturer'])->orderBy('brand_name')->get(),
            'manufacturers' => Manufacturer::active()->orderBy('name')->get(['id', 'name', 'short_name', 'type', 'phone']),
        ]);
    }

    public function update(UpdateMedicineBatchRequest $request, MedicineBatch $batch)
    {
        $batch->update($request->validated());

        return redirect()->route('admin.inventory.index')->with('success', 'Medicine batch details updated successfully.');
    }

    public function adjust(AdjustStockRequest $request, MedicineBatch $batch, InventoryService $inventoryService)
    {
        $validated = $request->validated();

        $inventoryService->adjustStock(
            $batch,
            (float) $validated['new_quantity'],
            $validated['reason'],
            $validated['transaction_type'],
            $request->user(),
            $validated['reference_number'] ?? null
        );

        return back()->with('success', 'Stock quantity adjusted and movement recorded.');
    }

    public function destroy(Request $request, MedicineBatch $batch)
    {
        abort_unless($request->user()?->can('inventory.delete'), 403);

        $batch->delete();

        return redirect()->route('admin.inventory.index')->with('success', 'Medicine batch removed from inventory.');
    }

    public function transactions(Request $request)
    {
        $query = StockTransaction::query()->with([
            'batch.medicine:id,name',
            'batch.pharmaceutical:id,brand_name,generic_name,strength',
            'performedBy:id,name',
            'visit.patient:id,name',
        ]);

        if ($request->filled('type')) {
            $query->where('transaction_type', $request->type);
        }

        if ($request->filled('batch_id')) {
            $query->where('medicine_batch_id', $request->batch_id);
        }

        $transactions = $query->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Inventory/Transactions', [
            'transactions' => $transactions,
            'filters' => $request->only(['type', 'batch_id']),
        ]);
    }
}
