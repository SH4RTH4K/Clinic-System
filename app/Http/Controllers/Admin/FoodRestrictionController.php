<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFoodRestrictionRequest;
use App\Http\Requests\Admin\UpdateFoodRestrictionRequest;
use App\Models\FoodRestriction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FoodRestrictionController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $category = $request->query('category', 'all');
        $defaultFilter = $request->query('default', 'all');
        $status = $request->query('status', 'all');

        $query = FoodRestriction::query()->withCount('visits');

        $query->search($search)
            ->category($category);

        if ($defaultFilter === 'default') {
            $query->where('is_default', true);
        } elseif ($defaultFilter === 'optional') {
            $query->where('is_default', false);
        }

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $query->orderBy('sort_order', 'asc')->orderBy('id', 'desc');

        $kpis = [
            'total' => FoodRestriction::count(),
            'default' => FoodRestriction::where('is_default', true)->count(),
            'antidote' => FoodRestriction::where('category', 'homeopathic_antidote')->count(),
            'sour_cold' => FoodRestriction::where('category', 'sour_cold')->count(),
            'spicy_oily' => FoodRestriction::where('category', 'spicy_oily')->count(),
            'allergic' => FoodRestriction::where('category', 'allergic_histamine')->count(),
            'metabolic' => FoodRestriction::where('category', 'chronic_metabolic')->count(),
            'general' => FoodRestriction::where('category', 'general')->count(),
            'active' => FoodRestriction::where('is_active', true)->count(),
        ];

        return Inertia::render('Admin/FoodRestrictions/Index', [
            'foodRestrictions' => $query->paginate(15)->withQueryString(),
            'kpis' => $kpis,
            'filters' => [
                'search' => $search ?? '',
                'category' => $category,
                'default' => $defaultFilter,
                'status' => $status,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/FoodRestrictions/Create');
    }

    public function store(StoreFoodRestrictionRequest $request): RedirectResponse
    {
        FoodRestriction::create([
            'text_bn' => $request->validated('text_bn'),
            'text_en' => $request->validated('text_en'),
            'category' => $request->validated('category') ?? 'general',
            'is_default' => $request->boolean('is_default'),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $request->validated('sort_order', 0) ?? 0,
        ]);

        return redirect()->route('admin.food_restrictions.index')->with('success', 'Dietary and food restriction added successfully.');
    }

    public function edit(FoodRestriction $foodRestriction): Response
    {
        return Inertia::render('Admin/FoodRestrictions/Edit', [
            'foodRestriction' => $foodRestriction->loadCount('visits'),
            'hasLinkedVisits' => $foodRestriction->visits()->exists(),
        ]);
    }

    public function update(UpdateFoodRestrictionRequest $request, FoodRestriction $foodRestriction): RedirectResponse
    {
        $foodRestriction->update([
            'text_bn' => $request->validated('text_bn'),
            'text_en' => $request->validated('text_en'),
            'category' => $request->validated('category') ?? 'general',
            'is_default' => $request->boolean('is_default'),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $request->validated('sort_order', 0) ?? 0,
        ]);

        return redirect()->route('admin.food_restrictions.index')->with('success', 'Dietary and food restriction updated successfully.');
    }

    public function destroy(FoodRestriction $foodRestriction): RedirectResponse
    {
        if ($foodRestriction->visits()->exists()) {
            $foodRestriction->update(['is_active' => false]);

            return back()->with('info', 'This food restriction is linked to patient prescriptions. It has been safely deactivated to protect historical clinical records.');
        }

        $foodRestriction->delete();

        return redirect()->route('admin.food_restrictions.index')->with('success', 'Dietary and food restriction deleted successfully.');
    }

    public function toggleStatus(FoodRestriction $foodRestriction): RedirectResponse
    {
        $foodRestriction->update(['is_active' => ! $foodRestriction->is_active]);

        $statusText = $foodRestriction->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Restriction has been {$statusText}.");
    }

    public function toggleDefault(FoodRestriction $foodRestriction): RedirectResponse
    {
        $foodRestriction->update(['is_default' => ! $foodRestriction->is_default]);

        $defaultText = $foodRestriction->is_default ? 'set as default for new visits' : 'removed from default presets';

        return back()->with('success', "Restriction has been {$defaultText}.");
    }
}
