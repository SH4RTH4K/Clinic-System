<?php

namespace App\Services;

use App\Models\AppointmentRequest;
use App\Models\ClinicSetting;
use App\Models\PatientNotification;
use App\Models\PatientQueueToken;
use App\Models\User;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CommunicationService
{
    /**
     * Send an SMS through the configured gateway driver.
     */
    public function sendSms(
        string $phone,
        string $message,
        string $eventType = 'custom_alert',
        ?int $patientId = null,
        ?User $sender = null
    ): PatientNotification {
        $cleanPhone = $this->cleanPhoneNumber($phone);
        $settings = ClinicSetting::first();
        $smsConfig = $settings ? $settings->getSmsConfig() : ClinicSetting::defaultSmsConfig();

        $provider = $smsConfig['sms_provider'] ?? 'log';
        $status = 'sent';
        $gatewayResponse = 'Logged successfully';

        // Real dispatch if enabled and not in log mode
        if (! empty($smsConfig['sms_enabled']) && $provider !== 'log') {
            try {
                if ($provider === 'generic_http' && ! empty($smsConfig['api_url'])) {
                    $response = Http::timeout(10)->post($smsConfig['api_url'], [
                        'api_key' => $smsConfig['api_key'] ?? '',
                        'sender_id' => $smsConfig['sender_id'] ?? 'RemediQ',
                        'phone' => $cleanPhone,
                        'message' => $message,
                    ]);
                    $status = $response->successful() ? 'sent' : 'failed';
                    $gatewayResponse = $response->body();
                } elseif ($provider === 'greenweb' || $provider === 'mimsms') {
                    $url = $smsConfig['api_url'] ?: 'https://api.mimsms.com/api/v3/send-sms';
                    $response = Http::timeout(10)->post($url, [
                        'api_key' => $smsConfig['api_key'] ?? '',
                        'senderid' => $smsConfig['sender_id'] ?? 'RemediQ',
                        'number' => $cleanPhone,
                        'message' => $message,
                    ]);
                    $status = $response->successful() ? 'sent' : 'failed';
                    $gatewayResponse = $response->body();
                }
            } catch (\Throwable $e) {
                $status = 'failed';
                $gatewayResponse = 'Exception: '.$e->getMessage();
                Log::error('SMS Gateway Error: '.$e->getMessage());
            }
        } else {
            Log::info("SMS Dispatched [Provider: {$provider}] to {$cleanPhone}: {$message}");
        }

        return PatientNotification::create([
            'patient_id' => $patientId,
            'channel' => 'sms',
            'recipient_phone' => $cleanPhone,
            'event_type' => $eventType,
            'message_body' => $message,
            'status' => $status,
            'gateway_provider' => $provider,
            'gateway_response' => $gatewayResponse,
            'sent_by' => $sender?->id,
            'sent_at' => Carbon::now(),
        ]);
    }

    /**
     * Send automatic SMS when an appointment is scheduled/confirmed.
     */
    public function sendAppointmentConfirmation(AppointmentRequest $appointment, ?User $sender = null): ?PatientNotification
    {
        $settings = ClinicSetting::first();
        $smsConfig = $settings ? $settings->getSmsConfig() : ClinicSetting::defaultSmsConfig();

        if (empty($smsConfig['sms_enabled']) || empty($smsConfig['auto_sms_appointments'])) {
            return null;
        }

        if (empty($appointment->phone)) {
            return null;
        }

        $template = $smsConfig['templates']['appointment_confirmed'] ??
            'Dear {patient_name}, your appointment with {doctor_name} at {clinic_name} is confirmed for {date} at {time}. Helpline: {phone}';

        $doctorName = 'Clinic Doctor';
        $clinicName = $settings?->clinic_name_en ?: 'RemediQ Clinic';
        $clinicPhone = $settings?->phone ?: '';

        $dateStr = $appointment->scheduled_date ? $appointment->scheduled_date->format('d M, Y') : 'Scheduled date';
        $timeStr = $appointment->scheduled_time ? substr((string) $appointment->scheduled_time, 0, 5) : 'Scheduled time';

        $message = str_replace(
            ['{patient_name}', '{doctor_name}', '{clinic_name}', '{date}', '{time}', '{phone}'],
            [$appointment->name, $doctorName, $clinicName, $dateStr, $timeStr, $clinicPhone],
            $template
        );

        return $this->sendSms(
            $appointment->phone,
            $message,
            'appointment_confirmation',
            $appointment->converted_patient_id,
            $sender
        );
    }

    /**
     * Send automatic SMS when a queue token is issued.
     */
    public function sendQueueTokenNotification(PatientQueueToken $token, ?User $sender = null): ?PatientNotification
    {
        $settings = ClinicSetting::first();
        $smsConfig = $settings ? $settings->getSmsConfig() : ClinicSetting::defaultSmsConfig();

        if (empty($smsConfig['sms_enabled']) || empty($smsConfig['auto_sms_queue'])) {
            return null;
        }

        if (empty($token->patient_phone)) {
            return null;
        }

        $template = $smsConfig['templates']['queue_token_issued'] ??
            'Token {token_code} issued for {patient_name} at {clinic_name}. Assigned to {doctor_name} ({service_room}). Please watch waiting room display.';

        $doctorName = $token->doctor?->name ?: 'Doctor';
        $clinicName = $settings?->clinic_name_en ?: 'RemediQ Clinic';

        $message = str_replace(
            ['{token_code}', '{patient_name}', '{clinic_name}', '{doctor_name}', '{service_room}'],
            [$token->token_code, $token->patient_name, $clinicName, $doctorName, $token->service_room ?: 'Chamber 1'],
            $template
        );

        return $this->sendSms(
            $token->patient_phone,
            $message,
            'queue_token',
            $token->patient_id,
            $sender
        );
    }

    /**
     * Check gateway balance or connectivity for the active SMS provider.
     *
     * @return array{status: string, provider: string, balance: string, unit: string, is_active: bool}
     */
    public function checkBalance(): array
    {
        $settings = ClinicSetting::first();
        $smsConfig = $settings ? $settings->getSmsConfig() : ClinicSetting::defaultSmsConfig();
        $provider = $smsConfig['sms_provider'] ?? 'log';
        $apiKey = $smsConfig['api_key'] ?? '';
        $isActive = (bool) ($smsConfig['sms_enabled'] ?? false);

        if ($provider === 'log') {
            return [
                'status' => 'success',
                'provider' => 'System Log (Local Mock)',
                'balance' => 'Unlimited',
                'unit' => 'Local development driver — zero SMS cost',
                'is_active' => $isActive,
            ];
        }

        if (empty($apiKey)) {
            return [
                'status' => 'warning',
                'provider' => ucfirst($provider),
                'balance' => 'No API Key Set',
                'unit' => 'Configure gateway token in settings below',
                'is_active' => $isActive,
            ];
        }

        try {
            if ($provider === 'greenweb') {
                $response = Http::timeout(8)->get('https://api.greenweb.com.bd/greb_sms_qty.php', [
                    'token' => $apiKey,
                ]);

                if ($response->successful()) {
                    $body = trim($response->body());

                    return [
                        'status' => 'success',
                        'provider' => 'Greenweb Bangladesh',
                        'balance' => is_numeric($body) ? number_format((float) $body) : $body,
                        'unit' => 'Remaining SMS Credits',
                        'is_active' => $isActive,
                    ];
                }
            } elseif ($provider === 'mimsms') {
                $url = ! empty($smsConfig['api_url']) ? rtrim($smsConfig['api_url'], '/').'/balance' : 'https://api.mimsms.com/api/v3/balance';
                $response = Http::timeout(8)->post($url, [
                    'api_key' => $apiKey,
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $balance = $json['balance'] ?? $json['data']['balance'] ?? $response->body();

                    return [
                        'status' => 'success',
                        'provider' => 'MimSMS Bangladesh',
                        'balance' => is_numeric($balance) ? number_format((float) $balance, 2) : (string) $balance,
                        'unit' => 'Account Balance BDT',
                        'is_active' => $isActive,
                    ];
                }
            } elseif ($provider === 'generic_http') {
                return [
                    'status' => 'success',
                    'provider' => 'Generic Custom Gateway',
                    'balance' => 'Connected',
                    'unit' => 'Endpoint: '.($smsConfig['api_url'] ?: 'Not configured'),
                    'is_active' => $isActive,
                ];
            }
        } catch (\Throwable $e) {
            return [
                'status' => 'error',
                'provider' => ucfirst($provider),
                'balance' => 'Unavailable',
                'unit' => 'Gateway error: '.$e->getMessage(),
                'is_active' => $isActive,
            ];
        }

        return [
            'status' => 'warning',
            'provider' => ucfirst($provider),
            'balance' => 'Unknown',
            'unit' => 'Unable to determine remaining balance',
            'is_active' => $isActive,
        ];
    }

    /**
     * Generate WhatsApp Click-to-Chat sharing URL with prefilled message.
     */
    public function generateWhatsAppShareUrl(Visit $visit): string
    {
        $visit->loadMissing(['patient', 'doctor']);
        $settings = ClinicSetting::first();
        $smsConfig = $settings ? $settings->getSmsConfig() : ClinicSetting::defaultSmsConfig();

        $patientPhone = $visit->patient?->phone ?: '';
        $cleanPhone = $this->cleanPhoneNumberForWhatsApp($patientPhone);

        $patientName = $visit->patient?->name ?: 'Patient';
        $doctorName = $visit->doctor?->name ?: 'Doctor';
        $clinicName = $settings?->clinic_name_en ?: 'RemediQ Clinic';
        $clinicPhone = $settings?->phone ?: '';
        $rxUrl = $visit->share_url;
        $visitDate = $visit->visit_date ? $visit->visit_date->format('d M, Y') : date('d M, Y');

        $template = $smsConfig['templates']['whatsapp_prescription'] ??
            "Dear {patient_name},\n\nHere is your Digital Prescription from {clinic_name} prescribed by {doctor_name} on {date}:\n👉 View & Download: {prescription_url}\n\nPlease follow the prescribed medicine dosages and instructions. For any query, contact our clinic at {phone}.\n\n— {clinic_name}";

        $text = str_replace(
            ['{patient_name}', '{doctor_name}', '{clinic_name}', '{date}', '{prescription_url}', '{phone}'],
            [$patientName, $doctorName, $clinicName, $visitDate, $rxUrl, $clinicPhone],
            $template
        );

        return 'https://api.whatsapp.com/send?phone='.urlencode($cleanPhone).'&text='.urlencode($text);
    }

    /**
     * Log a sent WhatsApp notification.
     */
    public function logWhatsAppSent(Visit $visit, string $phone, string $message, ?User $sender = null): PatientNotification
    {
        return PatientNotification::create([
            'patient_id' => $visit->patient_id,
            'channel' => 'whatsapp',
            'recipient_phone' => $this->cleanPhoneNumber($phone),
            'event_type' => 'prescription_ready',
            'message_body' => $message,
            'status' => 'sent',
            'gateway_provider' => 'whatsapp_click_to_chat',
            'gateway_response' => 'Shared via WhatsApp Click-to-Chat',
            'sent_by' => $sender?->id,
            'sent_at' => Carbon::now(),
        ]);
    }

    /**
     * Clean phone number for BD / International format.
     */
    public function cleanPhoneNumber(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if (str_starts_with($digits, '880')) {
            return '0'.substr($digits, 3);
        }

        return $digits;
    }

    /**
     * Clean phone number for WhatsApp wa.me link with country code.
     */
    public function cleanPhoneNumberForWhatsApp(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        // If local 11-digit BD number (e.g. 01711223344), add country code 880
        if (strlen($digits) === 11 && str_starts_with($digits, '01')) {
            return '88'.$digits;
        }

        if (str_starts_with($digits, '880')) {
            return $digits;
        }

        return $digits;
    }
}
