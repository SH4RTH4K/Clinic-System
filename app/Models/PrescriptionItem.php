<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PrescriptionItem extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'timing' => 'array',
        'prescription_snapshot' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([])
            ->setDescriptionForEvent(fn (string $eventName): string => $this->privacySafeActivityDescription($eventName));
    }

    private function privacySafeActivityDescription(string $eventName): string
    {
        $changedFields = array_values(array_diff(array_keys($this->getDirty()), ['created_at', 'updated_at']));
        $fieldSummary = $changedFields === [] ? '' : ' fields: '.implode(', ', $changedFields);

        return 'prescription_item.'.$eventName.$fieldSummary;
    }

    public function medicine()
    {
        return $this->belongsTo(Medicine::class);
    }
}
