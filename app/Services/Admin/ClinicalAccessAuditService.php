<?php

namespace App\Services\Admin;

use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class ClinicalAccessAuditService
{
    public function patientDetailViewed(Request $request, User $actor, Patient $patient, bool $includesPrescriptionHistory): void
    {
        $this->record($request, $actor, 'patient.detail.viewed', $patient, [
            'patient_id' => (int) $patient->id,
            'authorization_outcome' => 'allowed',
        ]);

        if ($includesPrescriptionHistory) {
            $this->record($request, $actor, 'prescription.history.viewed', $patient, [
                'patient_id' => (int) $patient->id,
                'authorization_outcome' => 'allowed',
            ]);
        }
    }

    public function visitDetailViewed(Request $request, User $actor, Visit $visit): void
    {
        $attributes = [
            'patient_id' => (int) $visit->patient_id,
            'visit_id' => (int) $visit->id,
            'authorization_outcome' => 'allowed',
        ];

        $this->record($request, $actor, 'visit.detail.viewed', $visit, $attributes);
        $this->record($request, $actor, 'prescription.history.viewed', $visit, $attributes);
    }

    public function prescriptionPdfExported(Request $request, User $actor, Visit $visit): void
    {
        $this->record($request, $actor, 'prescription.pdf.exported', $visit, [
            'patient_id' => (int) $visit->patient_id,
            'visit_id' => (int) $visit->id,
            'authorization_outcome' => 'allowed',
        ]);
    }

    public function clinicalAccessDenied(
        Request $request,
        User $actor,
        string $requiredPermission,
        ?int $visitId,
        ?int $patientId,
        ?string $denialReason = null,
    ): void {
        $attributes = [
            'authorization_outcome' => 'denied',
            'required_permission' => $requiredPermission,
        ];

        if ($visitId !== null) {
            $attributes['visit_id'] = $visitId;
        }

        if ($patientId !== null) {
            $attributes['patient_id'] = $patientId;
        }

        if (in_array($denialReason, ['prescription_not_issuable', 'unverified_prescription_snapshot'], true)) {
            $attributes['denial_reason'] = $denialReason;
        }

        $this->record($request, $actor, 'clinical.access.denied', null, $attributes);
    }

    /**
     * @param  array<string, int|string>  $attributes
     */
    private function record(Request $request, User $actor, string $event, ?Model $subject, array $attributes): void
    {
        $requestId = $request->attributes->get('clinical_access_request_id');

        if (! is_string($requestId)) {
            $requestId = (string) Str::uuid();
            $request->attributes->set('clinical_access_request_id', $requestId);
        }

        try {
            $logger = activity('clinical_access')
                ->causedBy($actor)
                ->event($event)
                ->withProperties([
                    ...$attributes,
                    'request_id' => $requestId,
                ]);

            if ($subject !== null) {
                $logger->on($subject);
            }

            $logger->log($event);
        } catch (Throwable $exception) {
            try {
                Log::warning('Clinical access audit write failed.', [
                    'event' => $event,
                    'exception' => $exception::class,
                ]);
            } catch (Throwable $loggingException) {
                try {
                    error_log(sprintf(
                        'Clinical access audit write failed; event=%s; audit_exception=%s; fallback_exception=%s',
                        $event,
                        $exception::class,
                        $loggingException::class,
                    ));
                } catch (Throwable) {
                    return;
                }
            }
        }
    }
}
