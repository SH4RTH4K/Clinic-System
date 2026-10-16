<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MedicineController extends Controller
{
    public function index(Request $request)
    {
        $query = Medicine::query();
        if ($request->search) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        return Inertia::render('Admin/Medicines/Index', [
            'medicines' => $query->paginate(10)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Medicines/Create');
    }

    public function store(Request $request)
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

        return redirect()->route('admin.medicines.index')->with('success', 'Medicine created.');
    }

    public function edit(Medicine $medicine)
    {
        return Inertia::render('Admin/Medicines/Edit', compact('medicine'));
    }

    public function update(Request $request, Medicine $medicine)
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

        return redirect()->route('admin.medicines.index')->with('success', 'Medicine updated.');
    }

    public function destroy(Medicine $medicine)
    {
        $medicine->update(['is_active' => false]); // soft delete logic basically

        return redirect()->route('admin.medicines.index')->with('success', 'Medicine deactivated.');
    }
}
