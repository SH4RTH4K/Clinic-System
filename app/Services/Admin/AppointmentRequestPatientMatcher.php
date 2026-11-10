<?php

namespace App\Services\Admin;

use App\Models\AppointmentRequest;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AppointmentRequestPatientMatcher
{
    /**
     * Find at most two exact matches; two are enough to flag ambiguity.
     *
     * @return EloquentCollection<int, Patient>
     */
    public function matchesFor(AppointmentRequest $appointmentRequest): EloquentCollection
    {
        return $this->matchingPatientsQuery($appointmentRequest)->limit(2)->get();
    }

    /**
     * Find normalized name and phone matches for the current request page in one query.
     *
     * @param  Collection<int, AppointmentRequest>  $appointmentRequests
     * @return Collection<string, EloquentCollection<int, Patient>>
     */
    public function matchesForRequests(Collection $appointmentRequests): Collection
    {
        $uniqueRequests = $appointmentRequests
            ->unique(fn (AppointmentRequest $request): string => $this->key($request->name, $request->phone))
            ->values();

        if ($uniqueRequests->isEmpty()) {
            return collect();
        }

        return Patient::query()
            ->select(['id', 'name', 'phone'])
            ->where(function (Builder $query) use ($uniqueRequests): void {
                foreach ($uniqueRequests as $appointmentRequest) {
                    $query->orWhere(function (Builder $pairQuery) use ($appointmentRequest): void {
                        $pairQuery
                            ->whereRaw('LOWER(TRIM(name)) = LOWER(TRIM(?))', [$appointmentRequest->name])
                            ->whereRaw('TRIM(phone) = TRIM(?)', [$appointmentRequest->phone]);
                    });
                }
            })
            ->get()
            ->groupBy(fn (Patient $patient): string => $this->key($patient->name, $patient->phone));
    }

    public function key(string $name, string $phone): string
    {
        return Str::lower(trim($name))."\0".trim($phone);
    }

    private function matchingPatientsQuery(AppointmentRequest $appointmentRequest): Builder
    {
        return Patient::query()
            ->select(['id', 'name', 'phone'])
            ->whereRaw('LOWER(TRIM(name)) = LOWER(TRIM(?))', [$appointmentRequest->name])
            ->whereRaw('TRIM(phone) = TRIM(?)', [$appointmentRequest->phone]);
    }
}
