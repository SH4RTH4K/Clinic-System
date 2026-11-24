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
            $query->where('category', $category);
        }

        $labInvestigations = $query->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/LabInvestigations/Index', [
            'labInvestigations' => $labInvestigations,
            'filters' => $request->only(['search', 'category']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/LabInvestigations/Create');
    }

    public function store(StoreLabInvestigationRequest $request): RedirectResponse
    {
        LabInvestigation::create($request->validated());

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
        $labInvestigation->update($request->validated());

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
            ->limit(20)
            ->get(['id', 'name', 'category', 'default_instructions']);

        return response()->json($results);
    }
}
