<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = Activity::with('causer')->latest();

        if ($request->search) {
            $query->where('description', 'like', '%'.$request->search.'%')
                ->orWhere('subject_type', 'like', '%'.$request->search.'%');
        }

        return Inertia::render('Admin/ActivityLogs/Index', [
            'logs' => $query->paginate(20)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }
}
