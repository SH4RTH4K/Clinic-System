<?php

namespace App\Services;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class QueueService
{
    /**
     * Generate the next daily sequential token number and formatted code.
     *
     * @return array{number: int, code: string}
     */
    public function generateNextTokenNumber(mixed $date = null): array
    {
        $tokenDate = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        $maxNumber = (int) PatientQueueToken::whereDate('token_date', $tokenDate)
            ->max('token_number');

        $nextNumber = $maxNumber + 1;
        $code = sprintf('T-%03d', $nextNumber);

        return [
            'number' => $nextNumber,
            'code' => $code,
        ];
    }

    /**
     * Issue a new patient queue token.
     *
     * @param  array<string, mixed>  $data
     */
    public function issueToken(array $data, ?User $user = null): PatientQueueToken
    {
        return DB::transaction(function () use ($data, $user) {
            $date = isset($data['token_date']) ? Carbon::parse($data['token_date'])->toDateString() : Carbon::today()->toDateString();

            ['number' => $tokenNumber, 'code' => $tokenCode] = $this->generateNextTokenNumber($date);

            $patientName = $data['patient_name'] ?? null;
            $patientPhone = $data['patient_phone'] ?? null;
            $patientId = $data['patient_id'] ?? null;

            if ($patientId && (! $patientName || ! $patientPhone)) {
                $patient = Patient::find($patientId);
                if ($patient) {
                    $patientName = $patientName ?: $patient->name;
                    $patientPhone = $patientPhone ?: $patient->phone;
                }
            }

            $serviceRoom = $data['service_room'] ?? null;
            $doctorId = $data['doctor_id'] ?? null;

            // Auto-detect room from doctor schedule if not explicitly given
            if (! $serviceRoom && $doctorId) {
                $dayOfWeek = Carbon::parse($date)->dayOfWeek;
                $doctor = Doctor::with(['schedules' => function ($q) use ($dayOfWeek) {
                    $q->active()->where('day_of_week', $dayOfWeek);
                }])->find($doctorId);

                $schedule = $doctor?->schedules->first();
                if ($schedule && $schedule->chamber_no) {
                    $serviceRoom = $schedule->chamber_no;
                }
            }

            $token = PatientQueueToken::create([
                'token_number' => $tokenNumber,
                'token_code' => $tokenCode,
                'token_date' => $date,
                'patient_id' => $patientId,
                'patient_name' => $patientName ?: 'Patient',
                'patient_phone' => $patientPhone,
                'doctor_id' => $doctorId,
                'service_room' => $serviceRoom ?: 'Consultation Room',
                'priority' => $data['priority'] ?? 'normal',
                'status' => 'waiting',
                'visit_id' => $data['visit_id'] ?? null,
                'appointment_request_id' => $data['appointment_request_id'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user?->id,
            ]);

            try {
                app(CommunicationService::class)->sendQueueTokenNotification($token, $user);
            } catch (\Throwable $e) {
                // Fail-safe: SMS delivery failure must never break token creation
            }

            return $token;
        });
    }

    /**
     * Call a patient queue token.
     */
    public function callToken(PatientQueueToken $token): PatientQueueToken
    {
        return DB::transaction(function () use ($token) {
            // If another token is currently calling for this doctor, reset it back to waiting
            if ($token->doctor_id) {
                PatientQueueToken::where('doctor_id', $token->doctor_id)
                    ->whereDate('token_date', $token->token_date)
                    ->where('id', '!=', $token->id)
                    ->where('status', 'calling')
                    ->update(['status' => 'waiting']);
            }

            $token->update([
                'status' => 'calling',
                'called_at' => Carbon::now(),
            ]);

            return $token->fresh(['patient', 'doctor']);
        });
    }

    /**
     * Re-announce / recall the same token.
     */
    public function recallToken(PatientQueueToken $token): PatientQueueToken
    {
        $token->update([
            'status' => 'calling',
            'called_at' => Carbon::now(),
        ]);

        return $token->fresh(['patient', 'doctor']);
    }

    /**
     * Start consultation for a token.
     */
    public function startConsultation(PatientQueueToken $token): PatientQueueToken
    {
        $token->update([
            'status' => 'in_consultation',
            'started_at' => Carbon::now(),
        ]);

        return $token->fresh(['patient', 'doctor']);
    }

    /**
     * Mark a token consultation as completed.
     */
    public function completeToken(PatientQueueToken $token, ?int $visitId = null): PatientQueueToken
    {
        $updates = [
            'status' => 'completed',
            'completed_at' => Carbon::now(),
        ];

        if ($visitId) {
            $updates['visit_id'] = $visitId;
        }

        $token->update($updates);

        return $token->fresh(['patient', 'doctor']);
    }

    /**
     * Mark a token as skipped.
     */
    public function skipToken(PatientQueueToken $token): PatientQueueToken
    {
        $token->update([
            'status' => 'skipped',
        ]);

        return $token->fresh(['patient', 'doctor']);
    }

    /**
     * Cancel a token.
     */
    public function cancelToken(PatientQueueToken $token): PatientQueueToken
    {
        $token->update([
            'status' => 'cancelled',
        ]);

        return $token->fresh(['patient', 'doctor']);
    }

    /**
     * Get snapshot for Waiting Room live TV queue display.
     *
     * @return array<string, mixed>
     */
    public function getWaitingRoomState(mixed $date = null, ?int $doctorId = null): array
    {
        $tokenDate = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        $baseQuery = PatientQueueToken::query()
            ->with(['doctor:id,name,name_bn,credentials,credentials_bn,specialty,specialty_bn'])
            ->whereDate('token_date', $tokenDate);

        if ($doctorId) {
            $baseQuery->where('doctor_id', $doctorId);
        }

        $allTokens = (clone $baseQuery)->get();

        $nowCalling = $allTokens->where('status', 'calling')
            ->sortByDesc('called_at')
            ->values();

        $inConsultation = $allTokens->where('status', 'in_consultation')
            ->sortByDesc('started_at')
            ->values();

        $nextInLine = $allTokens->where('status', 'waiting')
            ->sortBy(function (PatientQueueToken $token) {
                // Urgent tokens first, then by token number
                $priorityWeight = $token->priority === 'urgent' ? 0 : 1;

                return sprintf('%d_%06d', $priorityWeight, $token->token_number);
            })
            ->values()
            ->take(10);

        // Find the most recently called token in the last 60 seconds
        $recentlyCalled = $nowCalling->first(function (PatientQueueToken $token) {
            return $token->called_at && $token->called_at->diffInSeconds(Carbon::now()) <= 60;
        });

        // Compute summary metrics
        $counters = [
            'total' => $allTokens->count(),
            'waiting' => $allTokens->where('status', 'waiting')->count(),
            'calling' => $nowCalling->count(),
            'in_consultation' => $inConsultation->count(),
            'completed' => $allTokens->where('status', 'completed')->count(),
            'skipped' => $allTokens->where('status', 'skipped')->count(),
        ];

        // Active doctors with current room and active patient
        $doctors = Doctor::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(function (Doctor $doc) use ($nowCalling, $inConsultation) {
                $activeCalling = $nowCalling->firstWhere('doctor_id', $doc->id);
                $activeConsultation = $inConsultation->firstWhere('doctor_id', $doc->id);

                return [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'name_bn' => $doc->name_bn,
                    'credentials' => $doc->credentials,
                    'specialty' => $doc->specialty,
                    'current_calling' => $activeCalling ? [
                        'token_code' => $activeCalling->token_code,
                        'patient_name' => $activeCalling->masked_patient_name,
                        'room' => $activeCalling->service_room,
                    ] : null,
                    'current_consultation' => $activeConsultation ? [
                        'token_code' => $activeConsultation->token_code,
                        'patient_name' => $activeConsultation->masked_patient_name,
                        'room' => $activeConsultation->service_room,
                    ] : null,
                ];
            });

        return [
            'date' => $tokenDate,
            'now_calling' => $nowCalling,
            'in_consultation' => $inConsultation,
            'next_in_line' => $nextInLine,
            'recently_called' => $recentlyCalled,
            'counters' => $counters,
            'doctors' => $doctors,
        ];
    }
}
