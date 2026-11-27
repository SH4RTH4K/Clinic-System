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
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InventoryController extends Controller
{
    public function index(Request $request, InventoryService $inventoryService): Response
    {
        $query = MedicineBatch::query()->with([
            'medicine:id,name,potency,form',
            'pharmaceutical:id,brand_name,generic_name,strength,dosage_form,manufacturer',
        ]);

        if ($request->filled('type') && in_array($request->type, ['remedy', 'pharmaceutical'], true)) {
            $query->where('item_type', $request->type);
        }

        if ($request->filled('status') && in_array($request->input('status'), ['active', 'inactive'], true)) {
            $query->where('is_active', $request->input('status') === 'active');
        }

        if ($request->filled('stock_level') && $request->input('stock_level') !== 'all') {
            match ($request->input('stock_level')) {
                'low_stock' => $query->lowStock(),
                'out_of_stock' => $query->where('current_quantity', '<=', 0),
                'in_stock' => $query->where('current_quantity', '>', 0),
                default => null,
            };
        }

        if ($request->filled('expiry_status') && $request->input('expiry_status') !== 'all') {
            match ($request->input('expiry_status')) {
                'expired' => $query->expired(),
                'near_expiry' => $query->expiringSoon(90),
                'valid' => $query->where(fn ($q) => $q->whereNull('expiry_date')->orWhereDate('expiry_date', '>', now()->addDays(90))),
                default => null,
            };
        }

        // Backward compatibility for status query param
        if ($request->filled('status') && in_array($request->status, ['low_stock', 'expiring', 'expired', 'out_of_stock'], true)) {
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
            $query->where(function ($q) use ($term): void {
                $q->where('batch_number', 'like', "%{$term}%")
                    ->orWhere('supplier_name', 'like', "%{$term}%")
                    ->orWhere('potency', 'like', "%{$term}%")
                    ->orWhereHas('medicine', fn ($m) => $m->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('pharmaceutical', fn ($p) => $p->where('brand_name', 'like', "%{$term}%")
                        ->orWhere('generic_name', 'like', "%{$term}%")
                        ->orWhere('strength', 'like', "%{$term}%")
                        ->orWhere('manufacturer', 'like', "%{$term}%"));
            });
        }

        // FEFO & Custom Sorting
        $sort = $request->input('sort', 'latest');
        match ($sort) {
            'expiry_asc' => $query->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date ASC'),
            'stock_asc' => $query->orderBy('current_quantity', 'asc'),
            'valuation_desc' => $query->orderByRaw('(current_quantity * selling_price) DESC'),
            'name_asc' => $query->orderBy('batch_number', 'asc'),
            default => $query->latest(),
        };

        $perPage = (int) $request->input('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;

        $batches = $query->paginate($perPage)->withQueryString();
        $metrics = $inventoryService->getDashboardMetrics();

        return Inertia::render('Admin/Inventory/Index', [
            'batches' => $batches,
            'filters' => $request->only(['type', 'status', 'stock_level', 'expiry_status', 'search', 'sort', 'per_page']),
            'metrics' => $metrics,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Inventory/Create', [
            'medicines' => Medicine::query()->where('is_active', true)->select(['id', 'name', 'potency', 'form'])->orderBy('name')->get(),
            'pharmaceuticals' => Pharmaceutical::query()->where('is_active', true)->select(['id', 'brand_name', 'generic_name', 'strength', 'dosage_form', 'manufacturer'])->orderBy('brand_name')->get(),
            'manufacturers' => Manufacturer::active()->orderBy('name')->get(['id', 'name', 'short_name', 'type', 'phone']),
        ]);
    }

    public function store(StoreMedicineBatchRequest $request, InventoryService $inventoryService): RedirectResponse
    {
        $inventoryService->receiveStock($request->validated(), $request->user());

        return redirect()->route('admin.inventory.index')->with('success', 'Medicine batch received and inventory updated.');
    }

    public function edit(MedicineBatch $batch): Response
    {
        $batch->load(['medicine:id,name,potency,form', 'pharmaceutical:id,brand_name,generic_name,strength,dosage_form,manufacturer']);

        return Inertia::render('Admin/Inventory/Edit', [
            'batch' => $batch,
            'medicines' => Medicine::query()->where('is_active', true)->select(['id', 'name', 'potency', 'form'])->orderBy('name')->get(),
            'pharmaceuticals' => Pharmaceutical::query()->where('is_active', true)->select(['id', 'brand_name', 'generic_name', 'strength', 'dosage_form', 'manufacturer'])->orderBy('brand_name')->get(),
            'manufacturers' => Manufacturer::active()->orderBy('name')->get(['id', 'name', 'short_name', 'type', 'phone']),
        ]);
    }

    public function update(UpdateMedicineBatchRequest $request, MedicineBatch $batch): RedirectResponse
    {
        $batch->update($request->validated());

        return redirect()->route('admin.inventory.index')->with('success', 'Medicine batch details updated successfully.');
    }

    public function adjust(AdjustStockRequest $request, MedicineBatch $batch, InventoryService $inventoryService): RedirectResponse
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

    public function destroy(Request $request, MedicineBatch $batch): RedirectResponse
    {
        abort_unless($request->user()?->can('inventory.delete'), 403);

        $batch->delete();

        return redirect()->route('admin.inventory.index')->with('success', 'Batch record deleted from inventory.');
    }

    public function transactions(Request $request): Response
    {
        $query = StockTransaction::query()
            ->with(['batch.medicine', 'batch.pharmaceutical', 'performedBy:id,name'])
            ->latest();

        if ($type = $request->input('type')) {
            $query->where('transaction_type', $type);
        }

        return Inertia::render('Admin/Inventory/Transactions', [
            'transactions' => $query->paginate(20)->withQueryString(),
            'filters' => $request->only(['type']),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = MedicineBatch::query()->with([
            'medicine:id,name,potency,form',
            'pharmaceutical:id,brand_name,generic_name,strength,dosage_form,manufacturer',
        ]);

        if ($request->filled('type') && in_array($request->type, ['remedy', 'pharmaceutical'], true)) {
            $query->where('item_type', $request->type);
        }

        if ($request->filled('status') && in_array($request->input('status'), ['active', 'inactive'], true)) {
            $query->where('is_active', $request->input('status') === 'active');
        }

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term): void {
                $q->where('batch_number', 'like', "%{$term}%")
                    ->orWhere('supplier_name', 'like', "%{$term}%")
                    ->orWhereHas('medicine', fn ($m) => $m->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('pharmaceutical', fn ($p) => $p->where('brand_name', 'like', "%{$term}%")->orWhere('generic_name', 'like', "%{$term}%"));
            });
        }

        $sort = $request->input('sort', 'latest');
        match ($sort) {
            'expiry_asc' => $query->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date ASC'),
            'stock_asc' => $query->orderBy('current_quantity', 'asc'),
            'valuation_desc' => $query->orderByRaw('(current_quantity * selling_price) DESC'),
            default => $query->latest(),
        };

        $batches = $query->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="pharmacy-stocktake-audit-'.now()->format('Y-m-d').'.csv"',
        ];

        return response()->stream(function () use ($batches): void {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF"); // UTF-8 BOM

            fputcsv($file, [
                'Batch Number',
                'Item Type',
                'Item Name',
                'Potency / Strength',
                'Supplier / Manufacturer',
                'Purchase Price (BDT)',
                'Selling Price (BDT)',
                'Current Stock',
                'Reorder Level',
                'Expiry Date',
                'Stock Valuation Cost (BDT)',
                'Stock Valuation Retail (BDT)',
                'Status',
            ]);

            foreach ($batches as $b) {
                $costVal = (float) $b->current_quantity * (float) $b->purchase_price;
                $retailVal = (float) $b->current_quantity * (float) $b->selling_price;
                $strengthOrPotency = $b->item_type === 'remedy' ? ($b->potency ?? $b->medicine?->potency) : ($b->pharmaceutical?->strength ?? '—');
                $supplierOrMfr = $b->supplier_name ?: ($b->pharmaceutical?->manufacturer ?? '—');

                fputcsv($file, [
                    $b->batch_number,
                    $b->item_type === 'remedy' ? 'Homeopathic Remedy' : 'Conventional Pharmaceutical',
                    $b->item_name,
                    $strengthOrPotency ?? '—',
                    $supplierOrMfr,
                    number_format((float) $b->purchase_price, 2, '.', ''),
                    number_format((float) $b->selling_price, 2, '.', ''),
                    (float) $b->current_quantity,
                    (float) $b->reorder_level,
                    $b->expiry_date?->format('Y-m-d') ?? 'No Expiry',
                    number_format($costVal, 2, '.', ''),
                    number_format($retailVal, 2, '.', ''),
                    $b->is_active ? 'Active' : 'Inactive',
                ]);
            }

            fclose($file);
        }, 200, $headers);
    }
}
