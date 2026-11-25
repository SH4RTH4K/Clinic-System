<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreManufacturerRequest;
use App\Http\Requests\Admin\UpdateManufacturerRequest;
use App\Models\Manufacturer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ManufacturerController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Manufacturer::query();

        if ($search = $request->input('search')) {
            $query->search($search);
        }

        if ($request->filled('type') && $request->input('type') !== 'all') {
            $query->type($request->input('type'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('is_active', $request->input('status') === 'active');
        }

        $manufacturers = $query->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $metrics = [
            'total' => Manufacturer::count(),
            'allopathic' => Manufacturer::where('type', 'allopathic')->count(),
            'homeopathic' => Manufacturer::where('type', 'homeopathic')->count(),
            'active' => Manufacturer::where('is_active', true)->count(),
        ];

        return Inertia::render('Admin/Manufacturers/Index', [
            'manufacturers' => $manufacturers,
            'filters' => $request->only(['search', 'type', 'status']),
            'metrics' => $metrics,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Manufacturers/Create');
    }

    public function store(StoreManufacturerRequest $request): JsonResponse|RedirectResponse
    {
        $manufacturer = Manufacturer::create($request->validated());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'manufacturer' => $manufacturer,
            ], 201);
        }

        return redirect()->route('admin.manufacturers.index')
            ->with('success', 'Manufacturer registered successfully.');
    }

    public function edit(Manufacturer $manufacturer): Response
    {
        return Inertia::render('Admin/Manufacturers/Edit', [
            'manufacturer' => $manufacturer,
        ]);
    }

    public function update(UpdateManufacturerRequest $request, Manufacturer $manufacturer): RedirectResponse
    {
        $manufacturer->update($request->validated());

        return redirect()->route('admin.manufacturers.index')
            ->with('success', 'Manufacturer details updated successfully.');
    }

    public function destroy(Request $request, Manufacturer $manufacturer): RedirectResponse
    {
        abort_unless($request->user()?->can('manufacturers.delete'), 403);

        $manufacturer->update(['is_active' => false]);

        return redirect()->route('admin.manufacturers.index')
            ->with('success', 'Manufacturer deactivated successfully.');
    }

    public function search(Request $request): JsonResponse
    {
        $term = $request->query('query', '');

        $results = Manufacturer::active()
            ->search($term)
            ->limit(25)
            ->get(['id', 'name', 'short_name', 'type', 'phone', 'contact_person']);

        return response()->json($results);
    }
}
