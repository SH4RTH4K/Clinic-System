<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePharmaceuticalRequest;
use App\Http\Requests\Admin\UpdatePharmaceuticalRequest;
use App\Models\Pharmaceutical;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PharmaceuticalController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Pharmaceutical::query();

        if ($search = $request->input('search')) {
            $query->search($search);
        }

        if ($request->filled('dosage_form')) {
            $query->where('dosage_form', $request->input('dosage_form'));
        }

        $pharmaceuticals = $query->orderBy('brand_name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Pharmaceuticals/Index', [
            'pharmaceuticals' => $pharmaceuticals,
            'filters' => $request->only(['search', 'dosage_form']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Pharmaceuticals/Create');
    }

    public function store(StorePharmaceuticalRequest $request): RedirectResponse
    {
        Pharmaceutical::create($request->validated());

        return redirect()->route('admin.pharmaceuticals.index')
            ->with('success', 'Pharmaceutical drug added successfully.');
    }

    public function edit(Pharmaceutical $pharmaceutical): Response
    {
        return Inertia::render('Admin/Pharmaceuticals/Edit', [
            'pharmaceutical' => $pharmaceutical,
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

        $pharmaceutical->delete();

        return redirect()->route('admin.pharmaceuticals.index')
            ->with('success', 'Pharmaceutical drug removed.');
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
}
