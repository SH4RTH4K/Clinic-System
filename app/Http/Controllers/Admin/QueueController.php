<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreQueueTokenRequest;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Services\QueueService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    /**
     * Display reception queue dashboard.
     */
    public function index(Request $request, QueueService $queueService): Response
    {
        $date = $request->input('date', Carbon::today()->toDateString());
        $doctorId = $request->input('doctor_id');
        $status = $request->input('status');
        $search = $request->input('search');

        $query = PatientQueueToken::query()
            ->with([
                'patient:id,name,phone,patient_number',
                'doctor:id,name,name_bn,credentials,specialty',
                'visit:id,status',
            ])
            ->whereDate('token_date', $date);

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('token_code', 'like', "%{$search}%")
                    ->orWhere('patient_name', 'like', "%{$search}%")
                    ->orWhere('patient_phone', 'like', "%{$search}%");
            });
        }

        $tokens = $query->orderBy('token_number', 'asc')->paginate(30)->withQueryString();

        $doctors = Doctor::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'name_bn', 'credentials', 'specialty']);
        $queueState = $queueService->getWaitingRoomState($date, $doctorId ? (int) $doctorId : null);

        return Inertia::render('Admin/Queue/Index', [
            'tokens' => $tokens,
            'filters' => [
                'date' => $date,
                'doctor_id' => $doctorId,
                'status' => $status,
                'search' => $search,
            ],
            'doctors' => $doctors,
            'counters' => $queueState['counters'],
        ]);
    }

    /**
     * Show form to issue a new token.
     */
    public function create(Request $request): Response
    {
        $doctors = Doctor::query()->where('is_active', true)->with('schedules')->orderBy('sort_order')->get();
        $patients = Patient::query()->latest('id')->take(20)->get(['id', 'name', 'phone', 'patient_number']);

        $preselectedPatientId = $request->input('patient_id');
        $selectedPatient = $preselectedPatientId ? Patient::find($preselectedPatientId) : null;

        return Inertia::render('Admin/Queue/Create', [
            'doctors' => $doctors,
            'patients' => $patients,
            'selectedPatient' => $selectedPatient,
            'defaultDoctorId' => $request->input('doctor_id'),
            'appointmentRequestId' => $request->input('appointment_request_id'),
        ]);
    }

    /**
     * Store and issue a new token.
     */
    public function store(StoreQueueTokenRequest $request, QueueService $queueService): RedirectResponse
    {
        $token = $queueService->issueToken($request->validated(), $request->user());

        return redirect()->route('admin.queue.index', ['date' => $token->token_date->toDateString()])
            ->with('success', "Token {$token->token_code} issued successfully.");
    }

    /**
     * Call next patient.
     */
    public function call(PatientQueueToken $token, QueueService $queueService): RedirectResponse
    {
        $queueService->callToken($token);

        return back()->with('success', "Token {$token->token_code} called to {$token->service_room}.");
    }

    /**
     * Recall patient.
     */
    public function recall(PatientQueueToken $token, QueueService $queueService): RedirectResponse
    {
        $queueService->recallToken($token);

        return back()->with('success', "Token {$token->token_code} re-announced.");
    }

    /**
     * Start consultation.
     */
    public function startConsultation(PatientQueueToken $token, QueueService $queueService): RedirectResponse
    {
        $queueService->startConsultation($token);

        return back()->with('success', "Token {$token->token_code} entered consultation.");
    }

    /**
     * Complete token.
     */
    public function complete(PatientQueueToken $token, QueueService $queueService): RedirectResponse
    {
        $queueService->completeToken($token);

        return back()->with('success', "Token {$token->token_code} marked completed.");
    }

    /**
     * Skip token.
     */
    public function skip(PatientQueueToken $token, QueueService $queueService): RedirectResponse
    {
        $queueService->skipToken($token);

        return back()->with('success', "Token {$token->token_code} marked skipped.");
    }

    /**
     * Cancel/delete token.
     */
    public function destroy(PatientQueueToken $token, QueueService $queueService): RedirectResponse
    {
        $queueService->cancelToken($token);

        return back()->with('success', "Token {$token->token_code} cancelled.");
    }

    /**
     * Printable thermal token slip.
     */
    public function printToken(PatientQueueToken $token): Response
    {
        $token->load(['patient', 'doctor']);
        $settings = ClinicSetting::first();

        // Calculate queue position
        $aheadCount = PatientQueueToken::whereDate('token_date', $token->token_date)
            ->where('status', 'waiting')
            ->where('token_number', '<', $token->token_number)
            ->when($token->doctor_id, fn ($q) => $q->where('doctor_id', $token->doctor_id))
            ->count();

        return Inertia::render('Admin/Queue/PrintToken', [
            'token' => $token,
            'settings' => $settings,
            'aheadCount' => $aheadCount,
        ]);
    }

    /**
     * Doctor's chamber queue controller / workbench.
     */
    public function workbench(Request $request): Response
    {
        $user = $request->user();
        $doctors = Doctor::query()->where('is_active', true)->orderBy('sort_order')->get();

        // If user is linked to a doctor account, select that doctor by default
        $userDoctor = Doctor::where('user_id', $user?->id)->first();
        $selectedDoctorId = $request->input('doctor_id') ?? ($userDoctor?->id ?? $doctors->first()?->id);

        $selectedDoctor = $selectedDoctorId ? Doctor::find($selectedDoctorId) : null;
        $today = Carbon::today()->toDateString();

        $todayTokens = PatientQueueToken::query()
            ->with(['patient:id,name,phone,patient_number', 'visit:id,status'])
            ->whereDate('token_date', $today)
            ->when($selectedDoctorId, fn ($q) => $q->where('doctor_id', $selectedDoctorId))
            ->orderBy('token_number', 'asc')
            ->get();

        $currentCalling = $todayTokens->where('status', 'calling')->first();
        $currentConsultation = $todayTokens->where('status', 'in_consultation')->first();
        $waitingList = $todayTokens->where('status', 'waiting')->values();
        $completedList = $todayTokens->where('status', 'completed')->values();

        return Inertia::render('Admin/Queue/Workbench', [
            'doctors' => $doctors,
            'selectedDoctor' => $selectedDoctor,
            'currentCalling' => $currentCalling,
            'currentConsultation' => $currentConsultation,
            'waitingList' => $waitingList,
            'completedList' => $completedList,
            'todayDate' => $today,
        ]);
    }

    /**
     * Fullscreen Waiting Room Live TV Queue display view.
     */
    public function display(Request $request, QueueService $queueService): Response
    {
        $date = $request->input('date', Carbon::today()->toDateString());
        $doctorId = $request->input('doctor_id');

        $state = $queueService->getWaitingRoomState($date, $doctorId ? (int) $doctorId : null);
        $settings = ClinicSetting::first();

        return Inertia::render('Admin/Queue/Display', [
            'state' => $state,
            'settings' => $settings,
            'selectedDoctorId' => $doctorId,
        ]);
    }

    /**
     * Real-time JSON endpoint for live waiting room TV polling.
     */
    public function liveData(Request $request, QueueService $queueService): JsonResponse
    {
        $date = $request->input('date', Carbon::today()->toDateString());
        $doctorId = $request->input('doctor_id');

        $state = $queueService->getWaitingRoomState($date, $doctorId ? (int) $doctorId : null);

        return response()->json($state);
    }
}
