<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    /**
     * Display the Doctor Visual Calendar.
     */
    public function index(Request $request): Response
    {
        $doctorId = $request->input('doctor_id');
        $month = $request->input('month', Carbon::today()->format('Y-m'));

        $startDate = Carbon::parse($month.'-01')->startOfMonth()->toDateString();
        $endDate = Carbon::parse($month.'-01')->endOfMonth()->toDateString();

        $doctors = Doctor::query()
            ->where('is_active', true)
            ->with(['schedules' => fn ($q) => $q->active()])
            ->orderBy('sort_order')
            ->get();

        // 1. Scheduled Appointments
        $appointments = AppointmentRequest::query()
            ->whereNotNull('scheduled_date')
            ->whereDate('scheduled_date', '>=', $startDate)
            ->whereDate('scheduled_date', '<=', $endDate)
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->get(['id', 'name', 'phone', 'scheduled_date', 'scheduled_time', 'status', 'doctor_id']);

        // 2. Clinical Visits
        $visits = Visit::query()
            ->with(['patient:id,name,phone,patient_no,patient_series,patient_code', 'doctor:id,name'])
            ->whereDate('visit_date', '>=', $startDate)
            ->whereDate('visit_date', '<=', $endDate)
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->get(['id', 'visit_date', 'patient_id', 'doctor_id', 'status']);

        // 3. Doctor Leaves / Holidays
        $leaves = DoctorLeave::query()
            ->with('doctor:id,name')
            ->whereDate('leave_date', '>=', $startDate)
            ->whereDate('leave_date', '<=', $endDate)
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->get();

        return Inertia::render('Admin/Calendar/Index', [
            'doctors' => $doctors,
            'appointments' => $appointments,
            'visits' => $visits,
            'leaves' => $leaves,
            'filters' => [
                'doctor_id' => $doctorId,
                'month' => $month,
            ],
            'startDate' => $startDate,
            'endDate' => $endDate,
        ]);
    }

    /**
     * JSON events feed for interactive calendar views.
     */
    public function events(Request $request): JsonResponse
    {
        $doctorId = $request->input('doctor_id');
        $start = $request->input('start', Carbon::today()->startOfMonth()->toDateString());
        $end = $request->input('end', Carbon::today()->endOfMonth()->toDateString());

        $appointments = AppointmentRequest::query()
            ->whereNotNull('scheduled_date')
            ->whereDate('scheduled_date', '>=', $start)
            ->whereDate('scheduled_date', '<=', $end)
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->get()
            ->map(fn ($appt) => [
                'id' => 'appt-'.$appt->id,
                'type' => 'appointment',
                'title' => 'Appt: '.$appt->name,
                'date' => $appt->scheduled_date->toDateString(),
                'time' => $appt->scheduled_time,
                'status' => $appt->status,
                'url' => route('admin.appointment_requests.edit', $appt->id),
            ]);

        $visits = Visit::query()
            ->with(['patient:id,name'])
            ->whereDate('visit_date', '>=', $start)
            ->whereDate('visit_date', '<=', $end)
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->get()
            ->map(fn ($visit) => [
                'id' => 'visit-'.$visit->id,
                'type' => 'visit',
                'title' => 'Visit: '.($visit->patient?->name ?? 'Patient'),
                'date' => $visit->visit_date->toDateString(),
                'status' => $visit->status,
                'url' => route('admin.visits.show', $visit->id),
            ]);

        $leaves = DoctorLeave::query()
            ->with('doctor:id,name')
            ->whereDate('leave_date', '>=', $start)
            ->whereDate('leave_date', '<=', $end)
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->get()
            ->map(fn ($leave) => [
                'id' => 'leave-'.$leave->id,
                'type' => 'leave',
                'title' => 'Off: '.($leave->doctor?->name ?? 'Doctor').($leave->reason ? " ({$leave->reason})" : ''),
                'date' => $leave->leave_date->toDateString(),
                'status' => 'off',
            ]);

        return response()->json([
            'events' => $appointments->concat($visits)->concat($leaves)->values(),
        ]);
    }
}
