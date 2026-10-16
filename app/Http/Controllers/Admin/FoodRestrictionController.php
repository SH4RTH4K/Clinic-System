<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FoodRestriction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FoodRestrictionController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/FoodRestrictions/Index', [
            'foodRestrictions' => FoodRestriction::paginate(10),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/FoodRestrictions/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate(['text_en' => 'nullable|string', 'text_bn' => 'required|string', 'is_default' => 'boolean']);
        FoodRestriction::create($validated);

        return redirect()->route('admin.food_restrictions.index')->with('success', 'Food restriction created.');
    }

    public function edit(FoodRestriction $foodRestriction)
    {
        return Inertia::render('Admin/FoodRestrictions/Edit', compact('foodRestriction'));
    }

    public function update(Request $request, FoodRestriction $foodRestriction)
    {
        $validated = $request->validate(['text_en' => 'nullable|string', 'text_bn' => 'required|string', 'is_default' => 'boolean']);
        $foodRestriction->update($validated);

        return redirect()->route('admin.food_restrictions.index')->with('success', 'Food restriction updated.');
    }

    public function destroy(FoodRestriction $foodRestriction)
    {
        $foodRestriction->delete();

        return redirect()->route('admin.food_restrictions.index')->with('success', 'Food restriction deleted.');
    }
}
