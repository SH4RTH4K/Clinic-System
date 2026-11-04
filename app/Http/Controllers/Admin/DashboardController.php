<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $canViewClinicalRecords = $user->can('clinical_records.view');
        $access = [
            'patients' => $this->canView($user, 'patients.view'),
            'clinical_records' => $canViewClinicalRecords,
            'visits' => $canViewClinicalRecords && $this->canView($user, 'visits.view'),
            'appointments' => $this->canView($user, 'appointments.view'),
            'doctors' => $this->canView($user, 'doctors.view'),
            'medicines' => $this->canView($user, 'medicines.view'),
        ];
        $access['top_medicines'] = $access['visits'] && $access['medicines'];

        $props = [
            'access' => $access,
            'metrics' => [],
        ];

        if ($access['patients']) {
            $props['metrics']['total_patients'] = Patient::count();
            $props['metrics']['new_patients_this_month'] = Patient::where('created_at', '>=', now()->startOfMonth())->count();
        }

        if ($access['visits']) {
            $today = Carbon::today();
            $weekStart = $today->copy()->subDays(6);
            $weeklyVisitCounts = Visit::selectRaw('DATE(visit_date) as visit_day, count(*) as total')
                ->whereBetween('visit_date', [$weekStart->toDateString(), $today->toDateString()])
                ->groupBy('visit_day')
                ->pluck('total', 'visit_day');
            $weeklyVisits = collect(range(6, 0))->map(function (int $daysAgo) use ($today, $weeklyVisitCounts): array {
                $date = $today->copy()->subDays($daysAgo);

                return [
                    'date' => $date->toDateString(),
                    'label' => $date->format('D'),
                    'total' => (int) ($weeklyVisitCounts[$date->toDateString()] ?? 0),
                ];
            });

            $props['metrics']['todays_visits'] = Visit::whereDate('visit_date', $today)->count();
            $props['metrics']['weekly_visits_total'] = (int) $weeklyVisits->sum('total');
            $props['metrics']['draft_visits'] = Visit::where('status', 'draft')->count();
            $props['metrics']['finalized_visits'] = Visit::where('status', 'finalized')->count();
            $props['weekly_visits'] = $weeklyVisits;
            $props['recent_visits'] = $this->recentVisits($access['patients']);

            if ($access['top_medicines']) {
                $topMedicines = PrescriptionItem::with('medicine:id,name,potency')
                    ->selectRaw('medicine_id, count(*) as count')
                    ->where('created_at', '>=', now()->subDays(30))
                    ->groupBy('medicine_id')
                    ->orderByDesc('count')
                    ->limit(5)
                    ->get()
                    ->map(fn (PrescriptionItem $item): array => [
                        'medicine_id' => $item->medicine_id,
                        'name' => $item->medicine?->name ?? 'Unknown medicine',
                        'potency' => $item->medicine?->potency,
                        'count' => (int) $item->count,
                    ]);

                $props['top_medicines'] = $topMedicines;
                $props['top_medicine_max'] = max((int) $topMedicines->max('count'), 1);
            }
        }

        if ($access['appointments']) {
            $appointmentStatusCounts = AppointmentRequest::select('status')
                ->selectRaw('count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status');

            $props['metrics']['pending_requests'] = (int) ($appointmentStatusCounts['pending'] ?? 0);
            $props['appointment_status'] = [
                'pending' => (int) ($appointmentStatusCounts['pending'] ?? 0),
                'contacted' => (int) ($appointmentStatusCounts['contacted'] ?? 0),
                'scheduled' => (int) ($appointmentStatusCounts['scheduled'] ?? 0),
                'cancelled' => (int) ($appointmentStatusCounts['cancelled'] ?? 0),
            ];
            $props['recent_requests'] = AppointmentRequest::latest()
                ->limit(5)
                ->get(['id', 'name', 'phone', 'preferred_date', 'preferred_time', 'status', 'created_at']);
        }

        if ($access['doctors']) {
            $props['metrics']['active_doctors'] = Doctor::where('is_active', true)->count();
        }

        if ($access['medicines']) {
            $props['metrics']['total_medicines'] = Medicine::count();
            $props['metrics']['active_medicines'] = Medicine::where('is_active', true)->count();
        }

        return Inertia::render('Admin/Dashboard', $props);
    }

    private function canView(User $user, string $permission): bool
    {
        return $user->hasRole('Super Admin') || $user->can($permission);
    }

    /** @return array<int, array<string, mixed>> */
    private function recentVisits(bool $canViewPatients): array
    {
        $query = Visit::query()
            ->latest('visit_date')
            ->latest('id')
            ->limit(5);

        if ($canViewPatients) {
            $query->with('patient:id,name,patient_no,patient_series,patient_code');
        }

        return $query->get(['id', 'patient_id', 'visit_date', 'status', 'chief_complaint'])
            ->map(fn (Visit $visit): array => [
                'id' => $visit->id,
                'visit_date' => $visit->visit_date?->toDateString(),
                'status' => $visit->status,
                'chief_complaint' => $visit->chief_complaint,
                'patient' => $canViewPatients && $visit->patient ? [
                    'name' => $visit->patient->name,
                    'patient_identifier' => $visit->patient->patient_identifier,
                ] : null,
            ])
            ->all();
    }
}
