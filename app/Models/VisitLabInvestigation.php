<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitLabInvestigation extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function labInvestigation(): BelongsTo
    {
        return $this->belongsTo(LabInvestigation::class);
    }
}
