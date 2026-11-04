<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitAmendment extends Model
{
    protected $fillable = [
        'visit_id',
        'amended_by',
        'amended_by_doctor_id',
        'reason',
        'changed_fields',
    ];

    protected function casts(): array
    {
        return [
            'changed_fields' => 'array',
        ];
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function amendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'amended_by');
    }

    public function amendedByDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'amended_by_doctor_id');
    }
}
