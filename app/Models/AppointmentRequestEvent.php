<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentRequestEvent extends Model
{
    protected $fillable = [
        'appointment_request_id',
        'performed_by',
        'performed_by_name',
        'event_type',
        'previous_status',
        'new_status',
        'previous_scheduled_date',
        'previous_scheduled_time',
        'new_scheduled_date',
        'new_scheduled_time',
        'reason',
    ];

    protected $casts = [
        'previous_scheduled_date' => 'date',
        'new_scheduled_date' => 'date',
    ];

    public function appointmentRequest(): BelongsTo
    {
        return $this->belongsTo(AppointmentRequest::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
