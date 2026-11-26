<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLabInvestigationRequest;
use App\Http\Requests\Admin\UpdateLabInvestigationRequest;
use App\Models\LabInvestigation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LabInvestigationController extends Controller
{
    public function index(Request $request): Response
    {
        $query = LabInvestigation::query();

        if ($search = $request->input('search')) {
            $query->search($search);
        }

        if ($category = $request->input('category')) {
            $query->category($category);
        }

        if ($specimen = $request->input('specimen')) {
            $query->specimen($specimen);
        }

        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        // Metrics calculations
        $metrics = [
            'total' => LabInvestigation::count(),
            'active' => LabInvestigation::where('is_active', true)->count(),
            'with_fee' => LabInvestigation::where('standard_cost', '>', 0)->count(),
            'categories_count' => LabInvestigation::distinct('category')->count('category'),
            'category_breakdown' => LabInvestigation::selectRaw('category, count(*) as count')
                ->groupBy('category')
                ->pluck('count', 'category'),
            'specimen_breakdown' => LabInvestigation::selectRaw('specimen_type, count(*) as count')
                ->groupBy('specimen_type')
                ->pluck('count', 'specimen_type'),
        ];

        $labInvestigations = $query->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/LabInvestigations/Index', [
            'labInvestigations' => $labInvestigations,
            'filters' => $request->only(['search', 'category', 'status', 'specimen']),
            'metrics' => $metrics,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/LabInvestigations/Create');
    }

    public function store(StoreLabInvestigationRequest $request): RedirectResponse
    {
        $data = $request->validated();
        if (! isset($data['standard_cost']) || $data['standard_cost'] === null) {
            $data['standard_cost'] = 0.00;
        }

        LabInvestigation::create($data);

        return redirect()->route('admin.lab_investigations.index')
            ->with('success', 'Diagnostic lab investigation added successfully.');
    }

    public function edit(LabInvestigation $labInvestigation): Response
    {
        return Inertia::render('Admin/LabInvestigations/Edit', [
            'labInvestigation' => $labInvestigation,
        ]);
    }

    public function update(UpdateLabInvestigationRequest $request, LabInvestigation $labInvestigation): RedirectResponse
    {
        $data = $request->validated();
        if (! isset($data['standard_cost']) || $data['standard_cost'] === null) {
            $data['standard_cost'] = 0.00;
        }

        $labInvestigation->update($data);

        return redirect()->route('admin.lab_investigations.index')
            ->with('success', 'Diagnostic lab investigation updated successfully.');
    }

    public function destroy(LabInvestigation $labInvestigation): RedirectResponse
    {
        abort_unless(request()->user()?->can('lab_investigations.delete'), 403);

        $labInvestigation->delete();

        return redirect()->route('admin.lab_investigations.index')
            ->with('success', 'Diagnostic lab investigation removed.');
    }

    public function search(Request $request): JsonResponse
    {
        $term = $request->query('query', '');

        $results = LabInvestigation::active()
            ->search($term)
            ->orderBy('name')
            ->limit(25)
            ->get([
                'id',
                'name',
                'code',
                'name_bn',
                'category',
                'specimen_type',
                'standard_cost',
                'default_instructions',
                'reference_range',
                'turnaround_time',
            ]);

        return response()->json($results);
    }
}
