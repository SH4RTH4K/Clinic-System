<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdviceItem;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdviceItemController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/AdviceItems/Index', [
            'adviceItems' => AdviceItem::paginate(10),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/AdviceItems/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate(['text_en' => 'nullable|string', 'text_bn' => 'required|string', 'is_default' => 'boolean']);
        AdviceItem::create($validated);

        return redirect()->route('admin.advice_items.index')->with('success', 'Advice item created.');
    }

    public function edit(AdviceItem $adviceItem)
    {
        return Inertia::render('Admin/AdviceItems/Edit', compact('adviceItem'));
    }

    public function update(Request $request, AdviceItem $adviceItem)
    {
        $validated = $request->validate(['text_en' => 'nullable|string', 'text_bn' => 'required|string', 'is_default' => 'boolean']);
        $adviceItem->update($validated);

        return redirect()->route('admin.advice_items.index')->with('success', 'Advice item updated.');
    }

    public function destroy(AdviceItem $adviceItem)
    {
        $adviceItem->delete();

        return redirect()->route('admin.advice_items.index')->with('success', 'Advice item deleted.');
    }
}
