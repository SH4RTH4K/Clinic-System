<?php

namespace App\Services\Admin;

use App\Models\Doctor;
use App\Models\User;
use App\Models\Visit;

class VisitAuthorizationService
{
    public function activeDoctor(User $user, bool $lockForUpdate = false): ?Doctor
    {
        $query = Doctor::query()
            ->where('user_id', $user->id)
            ->where('is_active', true);

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        return $query->first();
    }

    public function canEdit(User $user, Visit $visit): bool
    {
        return $this->canEditWithDoctor($user, $visit, $this->activeDoctor($user));
    }

    public function canEditWithDoctor(User $user, Visit $visit, ?Doctor $doctor): bool
    {
        if (! $user->is_active || ! $user->can('clinical_records.view') || $visit->prescription_status === 'cancelled') {
            return false;
        }

        if ($visit->status === 'finalized') {
            return $this->canAmendWithDoctor($user, $visit, $doctor);
        }

        return $visit->status === 'draft'
            && $user->can('visits.update')
            && $this->ownsDraft($user, $visit, $doctor);
    }

    public function canDeleteDraft(User $user, Visit $visit, ?Doctor $doctor = null): bool
    {
        if (! $user->is_active
            || ! $user->can('clinical_records.view')
            || ! $user->can('visits.delete')
            || $visit->status !== 'draft'
            || $visit->prescription_status === 'cancelled') {
            return false;
        }

        return $this->ownsDraft($user, $visit, $doctor ?? $this->activeDoctor($user));
    }

    public function canFinalizeNewVisit(User $user): bool
    {
        return $user->is_active
            && $user->can('clinical_records.view')
            && $user->can('visits.create')
            && $user->can('visits.finalize')
            && $this->activeDoctor($user) !== null;
    }

    public function canFinalizeDraft(User $user, Visit $visit, ?Doctor $doctor = null): bool
    {
        if (! $user->is_active
            || ! $user->can('clinical_records.view')
            || ! $user->can('visits.update')
            || ! $user->can('visits.finalize')
            || $visit->status !== 'draft'
            || $visit->prescription_status === 'cancelled') {
            return false;
        }

        $doctor ??= $this->activeDoctor($user);

        return $doctor !== null
            && $doctor->is_active
            && (int) $doctor->user_id === (int) $user->id
            && $visit->doctor_id !== null
            && (int) $visit->doctor_id === (int) $doctor->id;
    }

    public function canAmend(User $user, Visit $visit): bool
    {
        return $this->canAmendWithDoctor($user, $visit, $this->activeDoctor($user));
    }

    public function canAmendWithDoctor(User $user, Visit $visit, ?Doctor $doctor): bool
    {
        if (! $user->is_active
            || ! $user->can('clinical_records.view')
            || ! $user->can('visits.amend')
            || $visit->status !== 'finalized'
            || $visit->prescription_status === 'cancelled'
            || $visit->doctor_id === null) {
            return false;
        }

        return $doctor !== null && (int) $visit->doctor_id === (int) $doctor->id;
    }

    public function canCancelPrescription(User $user, Visit $visit): bool
    {
        return $this->canCancelPrescriptionWithDoctor($user, $visit, $this->activeDoctor($user));
    }

    public function canCancelPrescriptionWithDoctor(User $user, Visit $visit, ?Doctor $doctor): bool
    {
        if (! $user->is_active
            || ! $user->can('clinical_records.view')
            || ! $user->can('visits.view')
            || ! $user->can('visits.cancel')
            || $visit->status !== 'finalized'
            || ! in_array($visit->prescription_status, ['finalized', 'amended'], true)
            || $visit->doctor_id === null
            || $doctor === null
            || ! $doctor->is_active
            || (int) $doctor->user_id !== (int) $user->id) {
            return false;
        }

        return (int) $visit->doctor_id === (int) $doctor->id
            || $user->can('visits.cancel_other');
    }

    private function ownsDraft(User $user, Visit $visit, ?Doctor $doctor): bool
    {
        if ($visit->doctor_id !== null) {
            return $doctor !== null && (int) $visit->doctor_id === (int) $doctor->id;
        }

        return $doctor === null
            && ! $user->doctorProfile()->exists()
            && $visit->created_by !== null
            && (int) $visit->created_by === (int) $user->id;
    }
}
