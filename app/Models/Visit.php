<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Visit extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'visit_date' => 'date',
        'follow_up_date' => 'date',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logUnguarded();
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function symptoms()
    {
        return $this->belongsToMany(Symptom::class, 'visit_symptom')->withPivot('note');
    }

    public function prescriptionItems()
    {
        return $this->hasMany(PrescriptionItem::class)->orderBy('sort_order');
    }

    public function adviceItems()
    {
        return $this->belongsToMany(AdviceItem::class, 'visit_advice');
    }

    public function foodRestrictions()
    {
        return $this->belongsToMany(FoodRestriction::class, 'visit_food_restriction');
    }
}
