<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LinkExistingAppointmentPatientRequest;
use App\Http\Requests\Admin\StoreAppointmentIntakeRequest;
use App\Http\Requests\Admin\UpdateAppointmentRequest;
use App\Models\AppointmentRequest;
use App\Models\AppointmentRequestEvent;
use App\Services\Admin\AppointmentRequestPatientMatcher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentRequestController extends Controller
{
    public function index(Request $request, AppointmentRequestPatientMatcher $patientMatcher): Response
    {
        $query = AppointmentRequest::query()
            ->with(['creator:id,name', 'handler:id,name'])
            ->latest();

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $requests = $query->paginate(15)->withQueryString();
        $user = $request->user();

        if ($user?->hasRole('Super Admin') || $user?->can('patients.view')) {
            $matches = $patientMatcher->matchesForRequests($requests->getCollection());

            $requests->getCollection()->each(function (AppointmentRequest $appointmentRequest) use ($matches, $patientMatcher): void {
                if ($appointmentRequest->converted_patient_id !== null) {
                    $appointmentRequest->setAttribute('existing_patient_match_id', null);
                    $appointmentRequest->setAttribute('has_ambiguous_patient_match', false);

                    return;
                }

                $matchingPatients = $matches->get(
                    $patientMatcher->key($appointmentRequest->name, $appointmentRequest->phone),
                    collect(),
                );

                $appointmentRequest->setAttribute(
                    'existing_patient_match_id',
                    $matchingPatients->count() === 1 ? $matchingPatients->first()->id : null,
                );
                $appointmentRequest->setAttribute('has_ambiguous_patient_match', $matchingPatients->count() > 1);
            });
        }

        return Inertia::render('Admin/AppointmentRequests/Index', [
            'requests' => $requests,
            'filters' => $request->only(['status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/AppointmentRequests/Create');
    }

    public function store(StoreAppointmentIntakeRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $actor = $request->user();

        DB::transaction(function () use ($validated, $actor): void {
            $appointmentRequest = AppointmentRequest::query()->create([
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'preferred_date' => $validated['preferred_date'] ?? null,
                'preferred_time' => $validated['preferred_time'] ?? null,
                'message' => $validated['message'] ?? null,
                'source' => $validated['source'],
                'created_by' => $actor->id,
                'status' => 'pending',
            ]);

            $appointmentRequest->events()->create([
                'performed_by' => $actor->id,
                'performed_by_name' => $actor->name,
                'event_type' => 'created',
                'new_status' => 'pending',
                'new_scheduled_date' => null,
                'new_scheduled_time' => null,
            ]);
        });

        return redirect()->route('admin.appointment_requests.index')
            ->with('success', 'Appointment request recorded. Confirm availability with the patient before scheduling.');
    }

    public function edit(AppointmentRequest $appointmentRequest): Response
    {
        $appointmentRequest->load([
            'creator:id,name',
            'handler:id,name',
            'events.performer:id,name',
        ]);

        return Inertia::render('Admin/AppointmentRequests/Edit', [
            'appointmentRequest' => [
                'id' => $appointmentRequest->id,
                'name' => $appointmentRequest->name,
                'phone' => $appointmentRequest->phone,
                'preferred_date' => $appointmentRequest->preferred_date?->toDateString(),
                'preferred_time' => $this->formatTime($appointmentRequest->preferred_time),
                'message' => $appointmentRequest->message,
                'source' => $appointmentRequest->source,
                'status' => $appointmentRequest->status,
                'scheduled_date' => $appointmentRequest->scheduled_date?->toDateString(),
                'scheduled_time' => $this->formatTime($appointmentRequest->scheduled_time),
                'creator_name' => $appointmentRequest->creator?->name,
                'handler_name' => $appointmentRequest->handler?->name,
                'events' => $appointmentRequest->events->map(fn (AppointmentRequestEvent $event): array => [
                    'id' => $event->id,
                    'event_type' => $event->event_type,
                    'performed_by_name' => $event->performed_by_name,
                    'previous_status' => $event->previous_status,
                    'new_status' => $event->new_status,
                    'previous_scheduled_date' => $event->previous_scheduled_date?->toDateString(),
                    'previous_scheduled_time' => $this->formatTime($event->previous_scheduled_time),
                    'new_scheduled_date' => $event->new_scheduled_date?->toDateString(),
                    'new_scheduled_time' => $this->formatTime($event->new_scheduled_time),
                    'reason' => $event->reason,
                    'created_at' => $event->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    public function update(UpdateAppointmentRequest $request, AppointmentRequest $appointmentRequest): RedirectResponse
    {
        $validated = $request->validated();
        $actor = $request->user();

        DB::transaction(function () use ($appointmentRequest, $validated, $actor): void {
            $lockedRequest = AppointmentRequest::query()
                ->lockForUpdate()
                ->findOrFail($appointmentRequest->getKey());

            $previousStatus = $lockedRequest->status;
            $previousDate = $lockedRequest->scheduled_date?->toDateString();
            $previousTime = $this->formatTime($lockedRequest->scheduled_time);
            $nextDate = array_key_exists('scheduled_date', $validated)
                ? $validated['scheduled_date']
                : $previousDate;
            $nextTime = array_key_exists('scheduled_time', $validated)
                ? $validated['scheduled_time']
                : $previousTime;
            $statusChanged = $previousStatus !== $validated['status'];
            $slotChanged = $previousDate !== $nextDate || $previousTime !== $nextTime;

            $lockedRequest->update([
                'status' => $validated['status'],
                'scheduled_date' => $nextDate,
                'scheduled_time' => $nextTime,
                'handled_by' => $actor->id,
            ]);

            if ($statusChanged || $slotChanged) {
                $eventType = $previousStatus === 'scheduled' && $slotChanged
                    ? 'rescheduled'
                    : ($validated['status'] === 'scheduled' && $previousStatus !== 'scheduled' ? 'scheduled' : 'status_changed');

                $lockedRequest->events()->create([
                    'performed_by' => $actor->id,
                    'performed_by_name' => $actor->name,
                    'event_type' => $eventType,
                    'previous_status' => $previousStatus,
                    'new_status' => $validated['status'],
                    'previous_scheduled_date' => $previousDate,
                    'previous_scheduled_time' => $previousTime,
                    'new_scheduled_date' => $nextDate,
                    'new_scheduled_time' => $nextTime,
                    'reason' => $validated['reason'] ?? null,
                ]);
            }
        });

        return redirect()->route('admin.appointment_requests.edit', $appointmentRequest)
            ->with('success', 'Appointment request updated.');
    }

    public function convertToPatient(Request $request, AppointmentRequest $appointmentRequest, AppointmentRequestPatientMatcher $patientMatcher): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->hasRole('Super Admin') || $user?->can('patients.create'), 403);

        if ($appointmentRequest->converted_patient_id !== null) {
            return redirect()->route('admin.appointment_requests.index')
                ->with('warning', 'This appointment request has already been linked to a patient. No duplicate patient was created.');
        }

        $matchingPatients = $patientMatcher->matchesFor($appointmentRequest);

        if ($matchingPatients->isNotEmpty()) {
            $message = $matchingPatients->count() === 1
                ? 'A patient with the same name and phone already exists. Link the existing patient instead of creating a duplicate.'
                : 'Multiple patients match this request. Review the patient records before continuing; no new patient was created.';

            return redirect()->route('admin.appointment_requests.index')->with('warning', $message);
        }

        return redirect()->route('admin.patients.create', [
            'appointment_request_id' => $appointmentRequest->id,
        ]);
    }

    public function linkExistingPatient(
        LinkExistingAppointmentPatientRequest $request,
        AppointmentRequest $appointmentRequest,
        AppointmentRequestPatientMatcher $patientMatcher,
    ): RedirectResponse {
        $alreadyLinked = false;
        $actor = $request->user();

        DB::transaction(function () use ($request, $appointmentRequest, $patientMatcher, $actor, &$alreadyLinked): void {
            $lockedRequest = AppointmentRequest::query()
                ->lockForUpdate()
                ->findOrFail($appointmentRequest->getKey());

            if ($lockedRequest->converted_patient_id !== null) {
                $alreadyLinked = true;

                return;
            }

            $matchingPatients = $patientMatcher->matchesFor($lockedRequest);
            $selectedPatientId = (int) $request->validated('patient_id');

            if ($matchingPatients->count() !== 1 || (int) $matchingPatients->first()->id !== $selectedPatientId) {
                throw ValidationException::withMessages([
                    'patient_id' => 'The exact patient match changed or is ambiguous. Review the records before linking.',
                ]);
            }

            $lockedRequest->converted_patient_id = $selectedPatientId;
            $lockedRequest->save();
            $lockedRequest->events()->create([
                'performed_by' => $actor->id,
                'performed_by_name' => $actor->name,
                'event_type' => 'patient_linked',
                'previous_status' => $lockedRequest->status,
                'new_status' => $lockedRequest->status,
                'previous_scheduled_date' => $lockedRequest->scheduled_date?->toDateString(),
                'previous_scheduled_time' => $this->formatTime($lockedRequest->scheduled_time),
                'new_scheduled_date' => $lockedRequest->scheduled_date?->toDateString(),
                'new_scheduled_time' => $this->formatTime($lockedRequest->scheduled_time),
                'reason' => 'Staff linked the existing patient after reviewing an exact name and phone match.',
            ]);
        });

        if ($alreadyLinked) {
            return redirect()->route('admin.appointment_requests.index')
                ->with('warning', 'This appointment request has already been linked to a patient.');
        }

        return redirect()->route('admin.appointment_requests.index')
            ->with('success', 'The existing patient was linked to this appointment request.');
    }

    public function destroy(Request $request, AppointmentRequest $appointmentRequest): RedirectResponse
    {
        $actor = $request->user();

        DB::transaction(function () use ($appointmentRequest, $actor): void {
            $lockedRequest = AppointmentRequest::query()
                ->lockForUpdate()
                ->findOrFail($appointmentRequest->getKey());

            $scheduledDate = $lockedRequest->scheduled_date?->toDateString();
            $scheduledTime = $this->formatTime($lockedRequest->scheduled_time);

            $lockedRequest->events()->create([
                'performed_by' => $actor->id,
                'performed_by_name' => $actor->name,
                'event_type' => 'archived',
                'previous_status' => $lockedRequest->status,
                'new_status' => $lockedRequest->status,
                'previous_scheduled_date' => $scheduledDate,
                'previous_scheduled_time' => $scheduledTime,
                'new_scheduled_date' => $scheduledDate,
                'new_scheduled_time' => $scheduledTime,
                'reason' => 'Removed from the active appointment request list.',
            ]);

        });

        return redirect()->route('admin.appointment_requests.index')
            ->with('success', 'Appointment request removed from the active list. Its audit history was preserved.');
    }

    private function formatTime(?string $time): ?string
    {
        return $time === null ? null : substr($time, 0, 5);
    }
}
