<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSymptomRequest;
use App\Http\Requests\Admin\UpdateSymptomRequest;
use App\Models\Symptom;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SymptomController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Symptom::query()->withCount('medicines');

        // 1. Debounced search with clean boolean precedence
        if ($search = $request->input('search')) {
            $query->search($search);
        }

        // 2. Repertory Chapter / Category filter
        if ($category = $request->input('category')) {
            $query->category($category);
        }

        // 3. Status filter
        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        // 4. Mapped to remedies filter
        if ($mapped = $request->input('mapped')) {
            if ($mapped === 'mapped') {
                $query->has('medicines');
            } elseif ($mapped === 'unmapped') {
                $query->doesntHave('medicines');
            }
        }

        // 5. Header KPI Metrics
        $metrics = [
            'total' => Symptom::count(),
            'active' => Symptom::where('is_active', true)->count(),
            'mapped' => Symptom::has('medicines')->count(),
            'unmapped' => Symptom::doesntHave('medicines')->count(),
            'chapters_count' => Symptom::distinct('category')->whereNotNull('category')->count('category'),
            'chapter_breakdown' => Symptom::selectRaw('category, count(*) as count')
                ->whereNotNull('category')
                ->groupBy('category')
                ->pluck('count', 'category'),
        ];

        $symptoms = $query->orderBy('name_en')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Symptoms/Index', [
            'symptoms' => $symptoms,
            'filters' => $request->only(['search', 'category', 'status', 'mapped']),
            'metrics' => $metrics,
        ]);
    }

    public function create(): Response
    {
        abort_unless(request()->user()?->can('symptoms.create'), 403);

        return Inertia::render('Admin/Symptoms/Create');
    }

    public function store(StoreSymptomRequest $request): RedirectResponse
    {
        Symptom::create($request->validated());

        return redirect()->route('admin.symptoms.index')
            ->with('success', 'Symptom rubric created successfully.');
    }

    public function edit(Symptom $symptom): Response
    {
        abort_unless(request()->user()?->can('symptoms.update'), 403);

        $symptom->loadCount('medicines');

        return Inertia::render('Admin/Symptoms/Edit', [
            'symptom' => $symptom,
        ]);
    }

    public function update(UpdateSymptomRequest $request, Symptom $symptom): RedirectResponse
    {
        $symptom->update($request->validated());

        return redirect()->route('admin.symptoms.index')
            ->with('success', 'Symptom rubric updated successfully.');
    }

    public function destroy(Request $request, Symptom $symptom): RedirectResponse
    {
        abort_unless($request->user()?->can('symptoms.delete'), 403);

        // Safe soft-deactivation if linked to visits or remedy mappings
        if ($symptom->visits()->exists() || $symptom->symptomMedicineMaps()->exists()) {
            $symptom->update(['is_active' => false]);

            return redirect()->route('admin.symptoms.index')
                ->with('success', 'Symptom is linked to clinical records and was deactivated.');
        }

        $symptom->delete();

        return redirect()->route('admin.symptoms.index')
            ->with('success', 'Symptom rubric removed.');
    }
}
