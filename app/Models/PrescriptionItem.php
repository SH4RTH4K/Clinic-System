<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class PrescriptionItem extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'timing' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'visit_id', 'medicine_id', 'sort_order',
                'timing', 'before_after', 'dose_qty', 'dose_unit',
                'dilution_note', 'duration_days',
            ])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function medicine()
    {
        return $this->belongsTo(Medicine::class);
    }
}
