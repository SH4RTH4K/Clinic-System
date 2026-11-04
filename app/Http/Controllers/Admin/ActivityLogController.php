<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = Activity::query()
            ->select(['id', 'log_name', 'description', 'subject_type', 'subject_id', 'event', 'causer_type', 'causer_id', 'properties', 'created_at'])
            ->with(['causer' => function (MorphTo $morphTo): void {
                $morphTo->constrain([
                    User::class => fn ($query) => $query->select(['id', 'name']),
                ]);
            }])
            ->latest()
            ->latest('id');

        if ($request->search) {
            $query->where('description', 'like', '%'.$request->search.'%')
                ->orWhere('subject_type', 'like', '%'.$request->search.'%');
        }

        $logs = $query->paginate(20)->withQueryString();
        $logs->getCollection()->transform(function (Activity $activity): Activity {
            if ($activity->log_name !== 'clinical_access') {
                return $activity->makeHidden(['properties']);
            }

            $activity->properties = $activity->properties?->only([
                'patient_id', 'visit_id', 'authorization_outcome', 'required_permission', 'denial_reason', 'request_id',
            ]) ?? collect();

            return $activity;
        });

        return Inertia::render('Admin/ActivityLogs/Index', [
            'logs' => $logs,
            'filters' => $request->only(['search']),
        ]);
    }
}
