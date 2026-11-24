<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDoctorLeaveRequest;
use App\Http\Requests\Admin\StoreDoctorScheduleRequest;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\DoctorSchedule;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        return Inertia::render('Admin/Calendar/Schedules', [
            'doctors' => $doctors,
            'selectedDoctor' => $selectedDoctor,
            'days' => DoctorSchedule::DAYS,
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
     * Record a doctor's leave / off-day.
     */
    public function storeLeave(StoreDoctorLeaveRequest $request, Doctor $doctor): RedirectResponse
    {
        DoctorLeave::updateOrCreate(
            [
                'doctor_id' => $doctor->id,
                'leave_date' => $request->validated('leave_date'),
            ],
            [
                'reason' => $request->validated('reason'),
            ]
        );

        return back()->with('success', "Leave recorded for {$doctor->name}.");
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
