<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use App\Services\InventoryService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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
            'queue' => $this->canView($user, 'queue.view'),
            'billing' => $this->canView($user, 'billing.view'),
            'reports' => $this->canView($user, 'reports.view'),
        ];
        $access['top_medicines'] = $access['visits'] && $access['medicines'];

        $props = [
            'access' => $access,
            'metrics' => [],
        ];

        if ($access['patients']) {
            $props['metrics']['total_patients'] = $this->safeQuery(fn () => Patient::count(), 0);
            $props['metrics']['new_patients_this_month'] = $this->safeQuery(
                fn () => Patient::where('created_at', '>=', now()->startOfMonth())->count(),
                0
            );
        }

        if ($access['queue']) {
            $props['metrics']['waiting_queue_count'] = $this->safeQuery(
                fn () => PatientQueueToken::whereDate('created_at', Carbon::today())
                    ->whereIn('status', ['waiting', 'calling'])
                    ->count(),
                0
            );
        }

        if ($access['billing']) {
            $props['metrics']['today_revenue'] = (float) $this->safeQuery(
                fn () => Invoice::whereDate('invoice_date', Carbon::today())->sum('paid_amount'),
                0.0
            );
            $props['metrics']['due_invoices_count'] = $this->safeQuery(
                fn () => Invoice::due()->count(),
                0
            );
        }

        $clinicSetting = $this->safeQuery(fn () => ClinicSetting::first());
        $props['practice_type'] = $clinicSetting?->practice_type ?? 'homeopathy';
        $props['clinic_name'] = $clinicSetting?->clinic_name_en ?? 'RemediQ Clinic';

        if ($access['visits']) {
            $today = Carbon::today();
            $weekStart = $today->copy()->subDays(6);
            $weeklyVisitCounts = $this->safeQuery(
                fn () => Visit::selectRaw('DATE(visit_date) as visit_day, count(*) as total')
                    ->whereBetween('visit_date', [$weekStart->toDateString(), $today->toDateString()])
                    ->groupByRaw('DATE(visit_date)')
                    ->pluck('total', 'visit_day'),
                collect()
            );
            $weeklyVisits = collect(range(6, 0))->map(function (int $daysAgo) use ($today, $weeklyVisitCounts): array {
                $date = $today->copy()->subDays($daysAgo);

                return [
                    'date' => $date->toDateString(),
                    'label' => $date->format('D'),
                    'total' => (int) ($weeklyVisitCounts[$date->toDateString()] ?? 0),
                ];
            });

            $props['metrics']['todays_visits'] = $this->safeQuery(fn () => Visit::whereDate('visit_date', $today)->count(), 0);
            $props['metrics']['weekly_visits_total'] = (int) $weeklyVisits->sum('total');
            $props['metrics']['draft_visits'] = $this->safeQuery(fn () => Visit::where('status', 'draft')->count(), 0);
            $props['metrics']['finalized_visits'] = $this->safeQuery(fn () => Visit::where('status', 'finalized')->count(), 0);
            $props['weekly_visits'] = $weeklyVisits;
            $props['recent_visits'] = $this->safeQuery(fn () => $this->recentVisits($access['patients']), []);

            if ($access['top_medicines']) {
                $topMedicines = $this->safeQuery(
                    fn () => PrescriptionItem::with('medicine:id,name,potency')
                        ->selectRaw('medicine_id, count(*) as count')
                        ->whereNotNull('medicine_id')
                        ->where('created_at', '>=', now()->subDays(30))
                        ->groupBy('medicine_id')
                        ->orderByRaw('count(*) desc')
                        ->limit(5)
                        ->get()
                        ->map(fn (PrescriptionItem $item): array => [
                            'medicine_id' => $item->medicine_id,
                            'name' => $item->medicine?->name ?? 'Unknown medicine',
                            'potency' => $item->medicine?->potency,
                            'count' => (int) $item->count,
                        ]),
                    collect()
                );

                $props['top_medicines'] = $topMedicines;
                $props['top_medicine_max'] = max((int) $topMedicines->max('count'), 1);
            }
        }

        if ($access['appointments']) {
            $appointmentStatusCounts = $this->safeQuery(
                fn () => AppointmentRequest::select('status')
                    ->selectRaw('count(*) as total')
                    ->groupBy('status')
                    ->pluck('total', 'status'),
                collect()
            );

            $props['metrics']['pending_requests'] = (int) ($appointmentStatusCounts['pending'] ?? 0);
            $props['appointment_status'] = [
                'pending' => (int) ($appointmentStatusCounts['pending'] ?? 0),
                'contacted' => (int) ($appointmentStatusCounts['contacted'] ?? 0),
                'scheduled' => (int) ($appointmentStatusCounts['scheduled'] ?? 0),
                'cancelled' => (int) ($appointmentStatusCounts['cancelled'] ?? 0),
            ];
            $props['recent_requests'] = $this->safeQuery(
                fn () => AppointmentRequest::latest()
                    ->limit(5)
                    ->get(['id', 'name', 'phone', 'preferred_date', 'preferred_time', 'status', 'created_at']),
                collect()
            );
        }

        if ($access['doctors']) {
            $props['metrics']['active_doctors'] = $this->safeQuery(fn () => Doctor::where('is_active', true)->count(), 0);
        }

        if ($access['medicines']) {
            $props['metrics']['total_medicines'] = $this->safeQuery(fn () => Medicine::count(), 0);
            $props['metrics']['active_medicines'] = $this->safeQuery(fn () => Medicine::where('is_active', true)->count(), 0);
        }

        $access['inventory'] = $this->canView($user, 'inventory.view');
        if ($access['inventory']) {
            $props['inventory_metrics'] = $this->safeQuery(function (): array {
                $inventoryService = app(InventoryService::class);
                $invMetrics = $inventoryService->getDashboardMetrics();

                return [
                    'low_stock_count' => $invMetrics['low_stock_count'] ?? 0,
                    'expiring_soon_count' => $invMetrics['expiring_count'] ?? 0,
                    'expired_count' => $invMetrics['expired_count'] ?? 0,
                    'total_batches' => $invMetrics['total_batches'] ?? 0,
                ];
            }, [
                'low_stock_count' => 0,
                'expiring_soon_count' => 0,
                'expired_count' => 0,
                'total_batches' => 0,
            ]);
        }

        return Inertia::render('Admin/Dashboard', $props);
    }

    /**
     * Safely run a metric query with error capture and fallback.
     */
    private function safeQuery(callable $callback, mixed $default = null): mixed
    {
        try {
            return $callback();
        } catch (\Throwable $e) {
            Log::warning('Dashboard metric failed: '.$e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile().':'.$e->getLine(),
            ]);

            return $default;
        }
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

        return $query->get(['id', 'patient_id', 'visit_date', 'status', 'chief_complaint', 'share_token'])
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
