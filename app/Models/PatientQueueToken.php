<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientQueueToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'token_number',
        'token_code',
        'token_date',
        'patient_id',
        'patient_name',
        'patient_phone',
        'doctor_id',
        'service_room',
        'priority',
        'status',
        'called_at',
        'started_at',
        'completed_at',
        'visit_id',
        'appointment_request_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'token_number' => 'integer',
        'token_date' => 'date',
        'called_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'masked_patient_name',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function appointmentRequest(): BelongsTo
    {
        return $this->belongsTo(AppointmentRequest::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeForToday(Builder $query): Builder
    {
        return $query->whereDate('token_date', Carbon::today());
    }

    public function scopeForDoctor(Builder $query, int $doctorId): Builder
    {
        return $query->where('doctor_id', $doctorId);
    }

    public function scopeWaiting(Builder $query): Builder
    {
        return $query->where('status', 'waiting');
    }

    public function scopeCalling(Builder $query): Builder
    {
        return $query->where('status', 'calling');
    }

    public function scopeInConsultation(Builder $query): Builder
    {
        return $query->where('status', 'in_consultation');
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', 'completed');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', ['waiting', 'calling', 'in_consultation']);
    }

    public function getMaskedPatientNameAttribute(): string
    {
        return self::maskName($this->patient_name ?? '');
    }

    public static function maskName(string $name): string
    {
        $name = trim($name);
        if ($name === '') {
            return 'Anonymous';
        }

        $parts = preg_split('/\s+/u', $name, -1, PREG_SPLIT_NO_EMPTY);
        if (empty($parts)) {
            return '***';
        }

        $masked = array_map(function ($part) {
            $len = mb_strlen($part);
            if ($len <= 2) {
                return mb_substr($part, 0, 1).'*';
            }
            $first = mb_substr($part, 0, 1);
            $last = mb_substr($part, -1, 1);
            $stars = str_repeat('*', min(4, max(2, $len - 2)));

            return $first.$stars.$last;
        }, $parts);

        return implode(' ', $masked);
    }
}
