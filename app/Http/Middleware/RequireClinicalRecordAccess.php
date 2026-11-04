<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Models\Visit;
use App\Services\Admin\ClinicalAccessAuditService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireClinicalRecordAccess
{
    public function __construct(private ClinicalAccessAuditService $audit) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        abort_unless($user instanceof User, 403);

        $authorized = in_array($permission, ['visits.view', 'visits.export'], true)
            && $user->can('clinical_records.view')
            && $user->can($permission);

        if ($permission === 'visits.export') {
            $authorized = $authorized && ($user->hasRole('Super Admin') || $user->can('patients.view'));
        }

        if (! $authorized) {
            $visit = $request->route('visit');
            $visitId = $visit instanceof Visit
                ? (int) $visit->id
                : (filter_var($visit, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: null);

            $this->audit->clinicalAccessDenied(
                $request,
                $user,
                $permission,
                $visitId,
                $visit instanceof Visit ? (int) $visit->patient_id : null,
            );

            abort(403);
        }

        return $next($request);
    }
}
