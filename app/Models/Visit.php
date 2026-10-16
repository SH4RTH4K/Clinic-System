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
        'age_at_visit' => 'integer',
        'age_months' => 'integer',
        'age_days' => 'integer',
    ];

    protected $appends = ['age_summary'];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                // Structural and status fields only.
                // chief_complaint, bp_symptoms_notes, diagnosis_notes excluded — clinical free-text.
                'patient_id', 'doctor_id', 'visit_date', 'age_at_visit', 'age_months', 'age_days',
                'status', 'follow_up_date', 'created_by',
            ])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function getAgeSummaryAttribute(): string
    {
        $parts = [];
        if (! is_null($this->age_at_visit) && $this->age_at_visit > 0) {
            $parts[] = "{$this->age_at_visit} Y";
        }
        if (! is_null($this->age_months) && $this->age_months > 0) {
            $parts[] = "{$this->age_months} M";
        }
        if ((is_null($this->age_at_visit) || $this->age_at_visit == 0) && ! is_null($this->age_days) && $this->age_days > 0) {
            $parts[] = "{$this->age_days} D";
        }

        if (empty($parts)) {
            if (! is_null($this->age_at_visit) && $this->age_at_visit == 0) {
                return '0 Y';
            }

            return $this->patient?->age_summary ?? 'N/A';
        }

        return implode(' ', $parts);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
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
