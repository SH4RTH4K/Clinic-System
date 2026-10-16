<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Symptom;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SymptomController extends Controller
{
    public function index(Request $request)
    {
        $query = Symptom::query();
        if ($request->search) {
            $query->where('name_en', 'like', '%'.$request->search.'%')
                ->orWhere('name_bn', 'like', '%'.$request->search.'%');
        }

        return Inertia::render('Admin/Symptoms/Index', [
            'symptoms' => $query->paginate(10)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Symptoms/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_en' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);
        Symptom::create($validated);

        return redirect()->route('admin.symptoms.index')->with('success', 'Symptom created.');
    }

    public function edit(Symptom $symptom)
    {
        return Inertia::render('Admin/Symptoms/Edit', compact('symptom'));
    }

    public function update(Request $request, Symptom $symptom)
    {
        $validated = $request->validate([
            'name_en' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);
        $symptom->update($validated);

        return redirect()->route('admin.symptoms.index')->with('success', 'Symptom updated.');
    }

    public function destroy(Symptom $symptom)
    {
        $symptom->update(['is_active' => false]);

        return redirect()->route('admin.symptoms.index')->with('success', 'Symptom deactivated.');
    }
}
