<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $query = Visit::with('patient');

        if ($request->start_date) {
            $query->whereDate('visit_date', '>=', $request->start_date);
        }
        if ($request->end_date) {
            $query->whereDate('visit_date', '<=', $request->end_date);
        }

        $visits = $query->orderBy('visit_date', 'desc')->get();

        return Inertia::render('Admin/Reports/Index', [
            'visits' => $visits,
            'filters' => $request->only(['start_date', 'end_date']),
        ]);
    }
}
