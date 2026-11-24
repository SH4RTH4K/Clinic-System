<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'channel',
        'recipient_phone',
        'event_type',
        'message_body',
        'status',
        'gateway_provider',
        'gateway_response',
        'sent_by',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function scopeSms(Builder $query): Builder
    {
        return $query->where('channel', 'sms');
    }

    public function scopeWhatsapp(Builder $query): Builder
    {
        return $query->where('channel', 'whatsapp');
    }

    public function scopeSent(Builder $query): Builder
    {
        return $query->where('status', 'sent');
    }

    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('status', 'failed');
    }

    public function scopeForPatient(Builder $query, int $patientId): Builder
    {
        return $query->where('patient_id', $patientId);
    }
}
