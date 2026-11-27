<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $filter = (string) $request->input('filter', 'all');
        $event = (string) $request->input('event', 'all');
        $causerId = $request->input('causer_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = $this->buildFilterQuery($search, $filter, $event, $causerId, $dateFrom, $dateTo);

        $logs = $query->paginate(20)->withQueryString();

        // Enforce RemediQ clinical data privacy whitelist
        $logs->getCollection()->transform(function (Activity $activity): Activity {
            if ($activity->log_name !== 'clinical_access') {
                return $activity->makeHidden(['properties', 'attribute_changes']);
            }

            $activity->properties = $activity->properties?->only([
                'patient_id', 'visit_id', 'authorization_outcome', 'required_permission', 'denial_reason', 'request_id',
            ]) ?? collect();

            return $activity->makeHidden(['attribute_changes']);
        });

        // Compute system-wide security KPIs
        $today = today();
        $totalLogs = Activity::count();
        $todayLogs = Activity::whereDate('created_at', $today)->count();
        $clinicalAccessCount = Activity::where('log_name', 'clinical_access')->count();
        $deniedAlertsCount = Activity::where(function (Builder $q) {
            $q->where('properties->authorization_outcome', 'denied')
                ->orWhere('event', 'like', '%denied%');
        })->count();
        $activeActorsToday = Activity::whereDate('created_at', $today)
            ->whereNotNull('causer_id')
            ->distinct('causer_id')
            ->count('causer_id');

        $kpis = [
            'total_logs' => $totalLogs,
            'today_logs' => $todayLogs,
            'clinical_access_count' => $clinicalAccessCount,
            'denied_alerts_count' => $deniedAlertsCount,
            'active_actors_today' => $activeActorsToday,
        ];

        // Unique actors for filter dropdown
        $actors = User::query()
            ->whereIn('id', Activity::distinct()->whereNotNull('causer_id')->pluck('causer_id'))
            ->orderBy('name')
            ->get(['id', 'name']);

        // Distinct events for filter dropdown
        $availableEvents = Activity::query()
            ->distinct()
            ->whereNotNull('event')
            ->orderBy('event')
            ->pluck('event');

        return Inertia::render('Admin/ActivityLogs/Index', [
            'logs' => $logs,
            'kpis' => $kpis,
            'actors' => $actors,
            'availableEvents' => $availableEvents,
            'filters' => [
                'search' => $search,
                'filter' => $filter,
                'event' => $event,
                'causer_id' => $causerId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = trim((string) $request->input('search', ''));
        $filter = (string) $request->input('filter', 'all');
        $event = (string) $request->input('event', 'all');
        $causerId = $request->input('causer_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = $this->buildFilterQuery($search, $filter, $event, $causerId, $dateFrom, $dateTo);

        $filename = 'activity_logs_audit_'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Log ID',
                'Timestamp',
                'Actor Name',
                'Event',
                'Description',
                'Category',
                'Target Model',
                'Subject ID',
                'Authorization Outcome',
                'Patient Reference',
                'Visit Reference',
            ]);

            $query->chunk(500, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    $modelName = $log->subject_type ? class_basename($log->subject_type) : '—';
                    $actorName = $log->causer?->name ?? 'System / Automated';
                    $outcome = $log->log_name === 'clinical_access'
                        ? ($log->properties?->get('authorization_outcome') ?? '—')
                        : '—';
                    $patientRef = $log->log_name === 'clinical_access'
                        ? ($log->properties?->get('patient_id') ? '#'.$log->properties->get('patient_id') : '—')
                        : '—';
                    $visitRef = $log->log_name === 'clinical_access'
                        ? ($log->properties?->get('visit_id') ? '#'.$log->properties->get('visit_id') : '—')
                        : '—';

                    fputcsv($handle, [
                        $log->id,
                        $log->created_at?->toIso8601String(),
                        $actorName,
                        $log->event ?? '—',
                        $log->description ?? '—',
                        $log->log_name ?? 'default',
                        $modelName,
                        $log->subject_id ?? '—',
                        $outcome,
                        $patientRef,
                        $visitRef,
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
            'Cache-Control' => 'no-store, no-cache',
        ]);
    }

    private function buildFilterQuery(
        string $search,
        string $filter,
        string $event,
        mixed $causerId,
        mixed $dateFrom,
        mixed $dateTo
    ): Builder {
        $query = Activity::query()
            ->select(['id', 'log_name', 'description', 'subject_type', 'subject_id', 'event', 'causer_type', 'causer_id', 'properties', 'created_at'])
            ->with(['causer' => function (MorphTo $morphTo): void {
                $morphTo->constrain([
                    User::class => fn ($q) => $q->select(['id', 'name']),
                ]);
            }])
            ->latest()
            ->latest('id');

        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('subject_type', 'like', "%{$search}%")
                    ->orWhere('event', 'like', "%{$search}%")
                    ->orWhereHasMorph('causer', [User::class], function (Builder $userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($filter === 'denied') {
            $query->where(function (Builder $q) {
                $q->where('properties->authorization_outcome', 'denied')
                    ->orWhere('event', 'like', '%denied%');
            });
        } elseif ($filter === 'clinical_access') {
            $query->where('log_name', 'clinical_access');
        } elseif ($filter === 'mutations') {
            $query->whereIn('event', ['created', 'updated', 'deleted']);
        } elseif ($filter === 'system_health') {
            $query->where(function (Builder $q) {
                $q->where('log_name', 'system_health')
                    ->orWhere('event', 'like', 'backup%');
            });
        } elseif ($filter === 'today') {
            $query->whereDate('created_at', today());
        }

        if ($event !== '' && $event !== 'all') {
            $query->where('event', $event);
        }

        if (! empty($causerId) && $causerId !== 'all') {
            $query->where('causer_type', User::class)->where('causer_id', $causerId);
        }

        if (! empty($dateFrom)) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if (! empty($dateTo)) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        return $query;
    }
}
