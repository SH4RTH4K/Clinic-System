<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdviceItemRequest;
use App\Http\Requests\Admin\UpdateAdviceItemRequest;
use App\Models\AdviceItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdviceItemController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $category = $request->query('category', 'all');
        $defaultFilter = $request->query('default', 'all');
        $status = $request->query('status', 'all');

        $query = AdviceItem::query()->withCount('visits');

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
            'total' => AdviceItem::count(),
            'default' => AdviceItem::where('is_default', true)->count(),
            'homeopathic' => AdviceItem::where('category', 'homeopathic')->count(),
            'general' => AdviceItem::where('category', 'general')->count(),
            'diet' => AdviceItem::where('category', 'diet')->count(),
            'lifestyle' => AdviceItem::where('category', 'lifestyle')->count(),
            'hygiene' => AdviceItem::where('category', 'hygiene')->count(),
            'warning' => AdviceItem::where('category', 'warning')->count(),
            'active' => AdviceItem::where('is_active', true)->count(),
        ];

        return Inertia::render('Admin/AdviceItems/Index', [
            'adviceItems' => $query->paginate(15)->withQueryString(),
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
        return Inertia::render('Admin/AdviceItems/Create');
    }

    public function store(StoreAdviceItemRequest $request): RedirectResponse
    {
        AdviceItem::create([
            'text_bn' => $request->validated('text_bn'),
            'text_en' => $request->validated('text_en'),
            'category' => $request->validated('category', 'general'),
            'is_default' => $request->boolean('is_default'),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $request->validated('sort_order', 0) ?? 0,
        ]);

        return redirect()->route('admin.advice_items.index')->with('success', 'Clinical advice item added successfully.');
    }

    public function edit(AdviceItem $adviceItem): Response
    {
        return Inertia::render('Admin/AdviceItems/Edit', [
            'adviceItem' => $adviceItem->loadCount('visits'),
            'hasLinkedVisits' => $adviceItem->visits()->exists(),
        ]);
    }

    public function update(UpdateAdviceItemRequest $request, AdviceItem $adviceItem): RedirectResponse
    {
        $adviceItem->update([
            'text_bn' => $request->validated('text_bn'),
            'text_en' => $request->validated('text_en'),
            'category' => $request->validated('category', 'general'),
            'is_default' => $request->boolean('is_default'),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $request->validated('sort_order', 0) ?? 0,
        ]);

        return redirect()->route('admin.advice_items.index')->with('success', 'Clinical advice item updated successfully.');
    }

    public function destroy(AdviceItem $adviceItem): RedirectResponse
    {
        if ($adviceItem->visits()->exists()) {
            $adviceItem->update(['is_active' => false]);

            return back()->with('info', 'This advice item is linked to patient prescriptions. It has been safely deactivated to protect historical clinical records.');
        }

        $adviceItem->delete();

        return back()->with('success', 'Clinical advice item removed successfully.');
    }
}
