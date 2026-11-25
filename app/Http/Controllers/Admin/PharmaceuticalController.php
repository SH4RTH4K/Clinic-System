<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePharmaceuticalRequest;
use App\Http\Requests\Admin\UpdatePharmaceuticalRequest;
use App\Models\Manufacturer;
use App\Models\MedicineBatch;
use App\Models\Pharmaceutical;
use App\Models\PrescriptionItem;
use App\Models\StockTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PharmaceuticalController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Pharmaceutical::query()
            ->withSum(['batches as total_stock' => function ($q) {
                $q->active();
            }], 'current_quantity')
            ->withCount(['batches as active_batches_count' => function ($q) {
                $q->active();
            }]);

        if ($search = $request->input('search')) {
            $query->search($search);
        }

        if ($request->filled('dosage_form') && $request->input('dosage_form') !== 'all') {
            $query->where('dosage_form', $request->input('dosage_form'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('is_active', $request->input('status') === 'active');
        }

        if ($request->filled('stock_status') && $request->input('stock_status') !== 'all') {
            if ($request->input('stock_status') === 'in_stock') {
                $query->whereHas('batches', fn ($b) => $b->active()->where('current_quantity', '>', 0));
            } elseif ($request->input('stock_status') === 'out_of_stock') {
                $query->whereDoesntHave('batches', fn ($b) => $b->active()->where('current_quantity', '>', 0));
            }
        }

        $perPage = (int) $request->input('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;

        $pharmaceuticals = $query->orderBy('brand_name')
            ->paginate($perPage)
            ->withQueryString();

        $dosageForms = Pharmaceutical::query()
            ->select('dosage_form')
            ->distinct()
            ->whereNotNull('dosage_form')
            ->orderBy('dosage_form')
            ->pluck('dosage_form');

        return Inertia::render('Admin/Pharmaceuticals/Index', [
            'pharmaceuticals' => $pharmaceuticals,
            'filters' => $request->only(['search', 'dosage_form', 'status', 'stock_status', 'per_page']),
            'availableDosageForms' => $dosageForms,
        ]);
    }

    public function create(): Response
    {
        $manufacturers = Manufacturer::active()->orderBy('name')->get(['id', 'name', 'short_name', 'type']);

        return Inertia::render('Admin/Pharmaceuticals/Create', [
            'manufacturers' => $manufacturers,
        ]);
    }

    public function store(StorePharmaceuticalRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $drug = Pharmaceutical::create([
                'generic_name' => $request->input('generic_name'),
                'brand_name' => $request->input('brand_name'),
                'dosage_form' => $request->input('dosage_form'),
                'strength' => $request->input('strength'),
                'manufacturer' => $request->input('manufacturer'),
                'description' => $request->input('description'),
                'is_active' => $request->boolean('is_active', true),
            ]);

            if ($request->boolean('receive_initial_batch') && (float) $request->input('initial_quantity') > 0) {
                $initialQty = (float) $request->input('initial_quantity');
                $purchasePrice = (float) $request->input('purchase_price', 0);

                $batch = MedicineBatch::create([
                    'item_type' => 'pharmaceutical',
                    'pharmaceutical_id' => $drug->id,
                    'batch_number' => $request->input('batch_number') ?: 'BATCH-'.strtoupper(substr(md5((string) uniqid()), 0, 8)),
                    'form' => strtolower($drug->dosage_form),
                    'potency' => $drug->strength,
                    'expiry_date' => $request->input('expiry_date'),
                    'purchase_date' => now()->toDateString(),
                    'purchase_price' => $purchasePrice,
                    'selling_price' => (float) $request->input('selling_price', 0),
                    'initial_quantity' => $initialQty,
                    'current_quantity' => $initialQty,
                    'unit' => $request->input('unit', 'unit'),
                    'reorder_level' => (float) $request->input('reorder_level', 10),
                    'supplier_name' => $request->input('supplier_name') ?: $drug->manufacturer,
                    'notes' => 'Opening inventory received during formulary registration',
                    'is_active' => true,
                ]);

                StockTransaction::create([
                    'medicine_batch_id' => $batch->id,
                    'transaction_type' => 'purchase',
                    'quantity' => $initialQty,
                    'balance_after' => $initialQty,
                    'reference_number' => $batch->batch_number,
                    'performed_by' => $request->user()?->id,
                    'notes' => 'Opening batch receipt',
                ]);
            }
        });

        return redirect()->route('admin.pharmaceuticals.index')
            ->with('success', 'Pharmaceutical drug registered in formulary.');
    }

    public function edit(Pharmaceutical $pharmaceutical): Response
    {
        $manufacturers = Manufacturer::active()->orderBy('name')->get(['id', 'name', 'short_name', 'type']);

        return Inertia::render('Admin/Pharmaceuticals/Edit', [
            'pharmaceutical' => $pharmaceutical,
            'manufacturers' => $manufacturers,
        ]);
    }

    public function update(UpdatePharmaceuticalRequest $request, Pharmaceutical $pharmaceutical): RedirectResponse
    {
        $pharmaceutical->update($request->validated());

        return redirect()->route('admin.pharmaceuticals.index')
            ->with('success', 'Pharmaceutical drug updated successfully.');
    }

    public function destroy(Pharmaceutical $pharmaceutical): RedirectResponse
    {
        abort_unless(request()->user()?->can('pharmaceuticals.delete'), 403);

        $hasBatches = $pharmaceutical->batches()->exists();
        $hasPrescriptions = PrescriptionItem::where('pharmaceutical_id', $pharmaceutical->id)->exists();

        if ($hasBatches || $hasPrescriptions) {
            $pharmaceutical->update(['is_active' => false]);

            return redirect()->route('admin.pharmaceuticals.index')
                ->with('success', 'Pharmaceutical drug deactivated successfully (preserved inventory history).');
        }

        $pharmaceutical->delete();

        return redirect()->route('admin.pharmaceuticals.index')
            ->with('success', 'Pharmaceutical drug removed from catalog.');
    }

    public function search(Request $request): JsonResponse
    {
        $term = $request->query('query', '');

        $results = Pharmaceutical::active()
            ->search($term)
            ->limit(20)
            ->get(['id', 'brand_name', 'generic_name', 'dosage_form', 'strength', 'manufacturer']);

        return response()->json($results);
    }

    public function export(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->can('pharmaceuticals.view'), 403);

        $query = Pharmaceutical::query()
            ->withSum(['batches as total_stock' => function ($q) {
                $q->active();
            }], 'current_quantity')
            ->withCount(['batches as active_batches_count' => function ($q) {
                $q->active();
            }]);

        if ($search = $request->input('search')) {
            $query->search($search);
        }

        if ($request->filled('dosage_form') && $request->input('dosage_form') !== 'all') {
            $query->where('dosage_form', $request->input('dosage_form'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('is_active', $request->input('status') === 'active');
        }

        $drugs = $query->orderBy('brand_name')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="pharmaceuticals-catalog-'.now()->format('Y-m-d').'.csv"',
        ];

        return response()->stream(function () use ($drugs): void {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel

            fputcsv($file, [
                'ID',
                'Brand Name',
                'Generic Name',
                'Dosage Form',
                'Strength',
                'Manufacturer',
                'Status',
                'Current Stock',
                'Active Batches',
            ]);

            foreach ($drugs as $drug) {
                fputcsv($file, [
                    $drug->id,
                    $drug->brand_name,
                    $drug->generic_name,
                    $drug->dosage_form,
                    $drug->strength,
                    $drug->manufacturer ?? '—',
                    $drug->is_active ? 'Active' : 'Inactive',
                    (float) ($drug->total_stock ?? 0),
                    $drug->active_batches_count ?? 0,
                ]);
            }

            fclose($file);
        }, 200, $headers);
    }
}
