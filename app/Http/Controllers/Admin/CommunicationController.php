<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SendCustomSmsRequest;
use App\Http\Requests\Admin\UpdateSmsSettingsRequest;
use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\PatientNotification;
use App\Models\Visit;
use App\Services\CommunicationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CommunicationController extends Controller
{
    /**
     * Display communication log & notification center.
     */
    public function index(Request $request): Response
    {
        $channel = $request->input('channel');
        $status = $request->input('status');
        $eventType = $request->input('event_type');
        $search = $request->input('search');

        $query = PatientNotification::query()
            ->with(['patient:id,name,phone,patient_no,patient_series,patient_code', 'sender:id,name'])
            ->latest('id');

        if ($channel) {
            $query->where('channel', $channel);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($eventType) {
            $query->where('event_type', $eventType);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('recipient_phone', 'like', "%{$search}%")
                    ->orWhere('message_body', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('patient_code', 'like', "%{$search}%")
                            ->orWhere('patient_no', 'like', "%{$search}%")
                            ->orWhere('old_or_other_id', 'like', "%{$search}%");
                    });
            });
        }

        $notifications = $query->paginate(25)->withQueryString();

        $metrics = [
            'total_sent' => PatientNotification::where('status', 'sent')->count(),
            'total_sms' => PatientNotification::where('channel', 'sms')->count(),
            'total_whatsapp' => PatientNotification::where('channel', 'whatsapp')->count(),
            'total_failed' => PatientNotification::where('status', 'failed')->count(),
            'today_count' => PatientNotification::whereDate('created_at', Carbon::today())->count(),
        ];

        $recentPatients = Patient::query()->latest('id')->take(20)->get(['id', 'name', 'phone', 'patient_no', 'patient_series', 'patient_code']);

        return Inertia::render('Admin/Communications/Index', [
            'notifications' => $notifications,
            'filters' => [
                'channel' => $channel,
                'status' => $status,
                'event_type' => $eventType,
                'search' => $search,
            ],
            'metrics' => $metrics,
            'recentPatients' => $recentPatients,
        ]);
    }

    /**
     * Send a custom direct SMS to a patient.
     */
    public function sendCustom(SendCustomSmsRequest $request, CommunicationService $commService): RedirectResponse
    {
        $data = $request->validated();

        $commService->sendSms(
            $data['phone'],
            $data['message'],
            'custom_alert',
            $data['patient_id'] ?? null,
            $request->user()
        );

        return back()->with('success', "SMS dispatched to {$data['phone']}.");
    }

    /**
     * Display SMS gateway and template configuration page.
     */
    public function settings(): Response
    {
        $settings = ClinicSetting::first();
        $smsConfig = $settings ? $settings->getSmsConfig() : ClinicSetting::defaultSmsConfig();

        return Inertia::render('Admin/Communications/Settings', [
            'config' => $smsConfig,
        ]);
    }

    /**
     * Update SMS gateway settings and message templates.
     */
    public function updateSettings(UpdateSmsSettingsRequest $request): RedirectResponse
    {
        $settings = ClinicSetting::first() ?? ClinicSetting::create([]);
        $settings->update([
            'sms_config' => $request->validated(),
        ]);

        return back()->with('success', 'SMS gateway settings and templates updated successfully.');
    }

    /**
     * Get pre-filled WhatsApp click-to-chat sharing URL for a visit.
     */
    public function whatsappUrl(Visit $visit, CommunicationService $commService, Request $request): JsonResponse
    {
        $url = $commService->generateWhatsAppShareUrl($visit);

        // Optionally record to notification ledger
        if ($request->boolean('log', true) && $visit->patient?->phone) {
            $commService->logWhatsAppSent(
                $visit,
                $visit->patient->phone,
                "Shared prescription link: {$visit->share_url}",
                $request->user()
            );
        }

        return response()->json([
            'url' => $url,
            'share_url' => $visit->share_url,
            'phone' => $visit->patient?->phone,
        ]);
    }
}
