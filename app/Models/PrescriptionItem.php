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
        return LogOptions::defaults()->logUnguarded();
    }

    public function medicine()
    {
        return $this->belongsTo(Medicine::class);
    }
}
