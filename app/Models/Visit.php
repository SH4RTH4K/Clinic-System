<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

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
        'finalized_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'prescriber_snapshot' => 'array',
        'prescription_authorizer_snapshot' => 'array',
        'patient_snapshot' => 'array',
    ];

    protected $appends = ['age_summary'];

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

        return 'visit.'.$eventName.$fieldSummary;
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

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    public function amendments(): HasMany
    {
        return $this->hasMany(VisitAmendment::class)->latest();
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
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
