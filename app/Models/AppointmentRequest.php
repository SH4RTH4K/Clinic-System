<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppointmentRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'preferred_date',
        'preferred_time',
        'message',
        'status',
        'handled_by',
        'source',
        'created_by',
        'scheduled_date',
        'scheduled_time',
    ];

    protected $casts = [
        'preferred_date' => 'date',
        'scheduled_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('exclude_archived_requests', function (Builder $query): void {
            $query->whereDoesntHave('events', function (Builder $eventQuery): void {
                $eventQuery->where('event_type', 'archived');
            });
        });
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function convertedPatient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'converted_patient_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AppointmentRequestEvent::class)->latest('id');
    }
}
