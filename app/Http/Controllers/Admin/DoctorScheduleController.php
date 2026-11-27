<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDoctorLeaveRequest;
use App\Http\Requests\Admin\StoreDoctorScheduleRequest;
use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\DoctorSchedule;
use App\Models\PatientQueueToken;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DoctorScheduleController extends Controller
{
    /**
     * Display doctor schedules and leaves configuration page.
     */
    public function index(Request $request): Response
    {
        $doctors = Doctor::query()
            ->where('is_active', true)
            ->with(['schedules', 'leaves' => fn ($q) => $q->whereDate('leave_date', '>=', Carbon::today())->orderBy('leave_date')])
            ->orderBy('sort_order')
            ->get();

        $selectedDoctorId = $request->input('doctor_id', $doctors->first()?->id);
        $selectedDoctor = $doctors->firstWhere('id', $selectedDoctorId) ?? $doctors->first();

        // Calculate Executive KPI metrics for selected doctor
        $selectedDoctorSchedules = $selectedDoctor ? $selectedDoctor->schedules->where('is_active', true) : collect();
        $weeklyHours = 0;
        foreach ($selectedDoctorSchedules as $sch) {
            if ($sch->start_time && $sch->end_time) {
                $start = Carbon::parse($sch->start_time);
                $end = Carbon::parse($sch->end_time);
                $weeklyHours += $start->diffInMinutes($end) / 60;
            }
        }

        $kpis = [
            'total_doctors' => $doctors->count(),
            'active_days' => $selectedDoctorSchedules->count(),
            'weekly_hours' => round($weeklyHours, 1),
            'assigned_chamber' => $selectedDoctorSchedules->first()?->chamber_no ?? 'Unassigned',
            'upcoming_leaves' => $selectedDoctor ? $selectedDoctor->leaves->count() : 0,
        ];

        return Inertia::render('Admin/Calendar/Schedules', [
            'doctors' => $doctors,
            'selectedDoctor' => $selectedDoctor,
            'days' => DoctorSchedule::DAYS,
            'kpis' => $kpis,
        ]);
    }

    /**
     * Update doctor's weekly schedules.
     */
    public function update(StoreDoctorScheduleRequest $request, Doctor $doctor): RedirectResponse
    {
        $schedules = $request->validated('schedules');

        foreach ($schedules as $item) {
            DoctorSchedule::updateOrCreate(
                [
                    'doctor_id' => $doctor->id,
                    'day_of_week' => $item['day_of_week'],
                ],
                [
                    'start_time' => $item['start_time'],
                    'end_time' => $item['end_time'],
                    'chamber_no' => $item['chamber_no'] ?? 'Chamber 1',
                    'slot_duration_minutes' => $item['slot_duration_minutes'] ?? 15,
                    'max_patients' => $item['max_patients'] ?? null,
                    'is_active' => $item['is_active'] ?? true,
                ]
            );
        }

        return back()->with('success', "Working hours for {$doctor->name} updated successfully.");
    }

    /**
     * Record a doctor's leave / off-day (single day or date range).
     */
    public function storeLeave(StoreDoctorLeaveRequest $request, Doctor $doctor): RedirectResponse
    {
        $validated = $request->validated();
        $startDate = Carbon::parse($validated['leave_date']);
        $endDate = ! empty($validated['leave_date_end']) ? Carbon::parse($validated['leave_date_end']) : $startDate->copy();

        $reason = ! empty($validated['reason']) ? $validated['reason'] : 'Official Leave';

        // Check for conflicting active queue tokens or appointment requests
        $conflictCount = 0;
        $conflictCount += PatientQueueToken::query()
            ->where('doctor_id', $doctor->id)
            ->whereDate('token_date', '>=', $startDate->toDateString())
            ->whereDate('token_date', '<=', $endDate->toDateString())
            ->whereIn('status', ['waiting', 'in_consultation'])
            ->count();

        $conflictCount += AppointmentRequest::query()
            ->where(function ($q) use ($startDate, $endDate) {
                $q->where(function ($sub) use ($startDate, $endDate) {
                    $sub->whereDate('scheduled_date', '>=', $startDate->toDateString())
                        ->whereDate('scheduled_date', '<=', $endDate->toDateString());
                })->orWhere(function ($sub) use ($startDate, $endDate) {
                    $sub->whereNull('scheduled_date')
                        ->whereDate('preferred_date', '>=', $startDate->toDateString())
                        ->whereDate('preferred_date', '<=', $endDate->toDateString());
                });
            })
            ->whereIn('status', ['pending', 'scheduled'])
            ->count();

        DB::transaction(function () use ($doctor, $startDate, $endDate, $reason) {
            $cursor = $startDate->copy();
            while ($cursor->lte($endDate)) {
                DoctorLeave::updateOrCreate(
                    [
                        'doctor_id' => $doctor->id,
                        'leave_date' => $cursor->toDateString(),
                    ],
                    [
                        'reason' => $reason,
                    ]
                );
                $cursor->addDay();
            }
        });

        $daysCount = $startDate->diffInDays($endDate) + 1;
        $message = $daysCount > 1
            ? "Leaves recorded for {$daysCount} days ({$startDate->format('M d')} – {$endDate->format('M d, Y')}) for {$doctor->name}."
            : "Leave recorded for {$doctor->name} on {$startDate->format('M d, Y')}.";

        if ($conflictCount > 0) {
            return back()->with('warning', "{$message} Note: {$conflictCount} active booking(s) exist on these dates. Please review the Calendar to reschedule affected patients.");
        }

        return back()->with('success', $message);
    }

    /**
     * Delete a doctor's leave.
     */
    public function destroyLeave(DoctorLeave $leave): RedirectResponse
    {
        $leave->delete();

        return back()->with('success', 'Leave removed successfully.');
    }
}
