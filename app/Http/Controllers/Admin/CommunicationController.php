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
    public function settings(CommunicationService $commService): Response
    {
        $settings = ClinicSetting::first();
        $smsConfig = $settings ? $settings->getSmsConfig() : ClinicSetting::defaultSmsConfig();

        $totalSent = PatientNotification::where('status', 'sent')->count();
        $totalFailed = PatientNotification::where('status', 'failed')->count();
        $totalDispatches = $totalSent + $totalFailed;

        $metrics = [
            'total_dispatches' => $totalDispatches,
            'total_sms' => PatientNotification::where('channel', 'sms')->count(),
            'total_whatsapp' => PatientNotification::where('channel', 'whatsapp')->count(),
            'total_sent' => $totalSent,
            'total_failed' => $totalFailed,
            'delivery_rate' => $totalDispatches > 0 ? round(($totalSent / $totalDispatches) * 100, 1) : 100,
            'today_dispatched' => PatientNotification::whereDate('created_at', Carbon::today())->count(),
        ];

        return Inertia::render('Admin/Communications/Settings', [
            'config' => $smsConfig,
            'metrics' => $metrics,
            'initialBalance' => $commService->checkBalance(),
        ]);
    }

    /**
     * Fetch real-time gateway credit balance from provider API.
     */
    public function gatewayBalance(CommunicationService $commService): JsonResponse
    {
        return response()->json($commService->checkBalance());
    }

    /**
     * Send a single live test SMS to verify gateway connectivity.
     */
    public function testSms(Request $request, CommunicationService $commService): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'min:11', 'max:20'],
            'message' => ['required', 'string', 'max:500'],
        ]);

        $notification = $commService->sendSms(
            $validated['phone'],
            $validated['message'],
            'test_dispatch',
            null,
            $request->user()
        );

        return response()->json([
            'status' => $notification->status,
            'gateway_provider' => $notification->gateway_provider,
            'gateway_response' => $notification->gateway_response,
            'message' => $notification->status === 'sent'
                ? "Test SMS dispatched successfully to {$validated['phone']}!"
                : "Gateway dispatch failed: {$notification->gateway_response}",
        ]);
    }

    /**
     * Update SMS gateway settings and message templates.
     */
    public function updateSettings(UpdateSmsSettingsRequest $request): RedirectResponse
    {
        $settings = ClinicSetting::first() ?? ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Healthcare',
            'clinic_name_bn' => 'রেমেডিক হেলথকেয়ার',
            'doctor_name' => 'Dr. Clinic Doctor',
            'doctor_credentials' => 'BHMS, MD',
            'address' => 'Dhaka, Bangladesh',
            'phone' => '01888000000',
        ]);
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
