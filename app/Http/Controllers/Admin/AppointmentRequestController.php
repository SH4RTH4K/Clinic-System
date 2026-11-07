<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAppointmentIntakeRequest;
use App\Http\Requests\Admin\UpdateAppointmentRequest;
use App\Models\AppointmentRequest;
use App\Models\AppointmentRequestEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $query = AppointmentRequest::query()
            ->with(['creator:id,name', 'handler:id,name'])
            ->latest();

        if ($request->status) {
            $query->where('status', $request->status);
        }

        return Inertia::render('Admin/AppointmentRequests/Index', [
            'requests' => $query->paginate(15)->withQueryString(),
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

    public function convertToPatient(AppointmentRequest $appointmentRequest): RedirectResponse
    {
        return redirect()->route('admin.patients.create', [
            'name' => $appointmentRequest->name,
            'phone' => $appointmentRequest->phone,
        ]);
    }

    private function formatTime(?string $time): ?string
    {
        return $time === null ? null : substr($time, 0, 5);
    }
}
