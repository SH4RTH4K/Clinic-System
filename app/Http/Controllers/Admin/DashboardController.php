<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();
        $weekStart = $today->copy()->subDays(6);

        $appointmentStatusCounts = AppointmentRequest::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');
        $weeklyVisitCounts = Visit::select(DB::raw('DATE(visit_date) as visit_day'), DB::raw('count(*) as total'))
            ->whereBetween('visit_date', [$weekStart->toDateString(), $today->toDateString()])
            ->groupBy('visit_day')
            ->pluck('total', 'visit_day');
        $weeklyVisits = collect(range(6, 0))->map(function (int $daysAgo) use ($today, $weeklyVisitCounts) {
            $date = $today->copy()->subDays($daysAgo);

            return [
                'date' => $date->toDateString(),
                'label' => $date->format('D'),
                'total' => (int) ($weeklyVisitCounts[$date->toDateString()] ?? 0),
            ];
        });
        $topMedicines = PrescriptionItem::with('medicine:id,name,potency')
            ->select('medicine_id', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('medicine_id')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(fn (PrescriptionItem $item) => [
                'medicine_id' => $item->medicine_id,
                'name' => $item->medicine?->name ?? 'Unknown medicine',
                'potency' => $item->medicine?->potency,
                'count' => (int) $item->count,
            ]);
        $topMedicineMax = max((int) $topMedicines->max('count'), 1);

        return Inertia::render('Admin/Dashboard', [
            'metrics' => [
                'total_patients' => Patient::count(),
                'new_patients_this_month' => Patient::where('created_at', '>=', now()->startOfMonth())->count(),
                'todays_visits' => Visit::whereDate('visit_date', $today)->count(),
                'weekly_visits_total' => (int) $weeklyVisits->sum('total'),
                'draft_visits' => Visit::where('status', 'draft')->count(),
                'finalized_visits' => Visit::where('status', 'finalized')->count(),
                'pending_requests' => (int) ($appointmentStatusCounts['pending'] ?? 0),
                'active_doctors' => Doctor::where('is_active', true)->count(),
                'total_medicines' => Medicine::count(),
                'active_medicines' => Medicine::where('is_active', true)->count(),
            ],
            'appointment_status' => [
                'pending' => (int) ($appointmentStatusCounts['pending'] ?? 0),
                'contacted' => (int) ($appointmentStatusCounts['contacted'] ?? 0),
                'scheduled' => (int) ($appointmentStatusCounts['scheduled'] ?? 0),
                'cancelled' => (int) ($appointmentStatusCounts['cancelled'] ?? 0),
            ],
            'weekly_visits' => $weeklyVisits,
            'top_medicines' => $topMedicines,
            'top_medicine_max' => $topMedicineMax,
            'recent_requests' => AppointmentRequest::latest()
                ->limit(5)
                ->get(['id', 'name', 'phone', 'preferred_date', 'preferred_time', 'status', 'created_at']),
            'recent_visits' => Visit::with('patient:id,name,patient_no,patient_series')
                ->latest('visit_date')
                ->latest('id')
                ->limit(5)
                ->get(['id', 'patient_id', 'visit_date', 'status', 'chief_complaint']),
        ]);
    }
}
