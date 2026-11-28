<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportMedicinesRequest;
use App\Models\Medicine;
use App\Services\Admin\MedicineImportExportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedicineController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Medicine::query()
            ->withSum(['batches as total_stock' => function ($q) {
                $q->active();
            }], 'current_quantity')
            ->withCount(['batches as active_batches_count' => function ($q) {
                $q->active();
            }]);

        if ($search = $request->input('search')) {
            $query->search($search);
        }

        if ($request->filled('scale') && $request->input('scale') !== 'all') {
            $query->scale($request->input('scale'));
        }

        if ($request->filled('form') && $request->input('form') !== 'all') {
            $query->where('form', $request->input('form'));
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

        $medicines = $query->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        $availableForms = Medicine::query()
            ->select('form')
            ->distinct()
            ->whereNotNull('form')
            ->orderBy('form')
            ->pluck('form');

        $kpis = [
            'total_remedies' => Medicine::count(),
            'ch_count' => Medicine::scale('ch')->count(),
            'lm_count' => Medicine::scale('lm')->count(),
            'x_count' => Medicine::scale('x')->count(),
            'mother_tincture_count' => Medicine::scale('q')->count(),
            'in_stock_count' => Medicine::whereHas('batches', fn ($b) => $b->active()->where('current_quantity', '>', 0))->count(),
        ];

        return Inertia::render('Admin/Medicines/Index', [
            'medicines' => $medicines,
            'filters' => $request->only(['search', 'scale', 'form', 'status', 'stock_status', 'per_page']),
            'availableForms' => $availableForms,
            'kpis' => $kpis,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Medicines/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'potency' => 'required|string|max:50',
            'form' => 'required|in:drops,pills,liquid',
            'default_instruction' => 'nullable|string',
            'stock_qty' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        Medicine::create($validated);

        return redirect()->route('admin.medicines.index')->with('success', 'Medicine created successfully.');
    }

    public function edit(Medicine $medicine): Response
    {
        return Inertia::render('Admin/Medicines/Edit', compact('medicine'));
    }

    public function update(Request $request, Medicine $medicine): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'potency' => 'required|string|max:50',
            'form' => 'required|in:drops,pills,liquid',
            'default_instruction' => 'nullable|string',
            'stock_qty' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $medicine->update($validated);

        return redirect()->route('admin.medicines.index')->with('success', 'Medicine updated successfully.');
    }

    public function destroy(Medicine $medicine): RedirectResponse
    {
        $medicine->update(['is_active' => false]);

        return redirect()->route('admin.medicines.index')->with('success', 'Medicine deactivated successfully.');
    }

    public function export(Request $request, MedicineImportExportService $service): StreamedResponse
    {
        return $service->exportCsv($request);
    }

    public function downloadTemplate(MedicineImportExportService $service): StreamedResponse
    {
        return $service->downloadTemplate();
    }

    public function import(ImportMedicinesRequest $request, MedicineImportExportService $service): RedirectResponse
    {
        $result = $service->import(
            $request->file('file'),
            (string) $request->validated('duplicate_strategy')
        );

        $msg = "Import completed: {$result['created']} added, {$result['updated']} updated, {$result['skipped']} skipped (out of {$result['total_rows']} total rows).";

        $response = redirect()->route('admin.medicines.index')->with('success', $msg);

        if (! empty($result['errors'])) {
            $warnings = implode(' | ', array_slice($result['errors'], 0, 5));
            if (count($result['errors']) > 5) {
                $warnings .= ' ...and '.(count($result['errors']) - 5).' more.';
            }
            $response->with('warning', 'Some rows had validation notices: '.$warnings);
        }

        return $response;
    }
}
