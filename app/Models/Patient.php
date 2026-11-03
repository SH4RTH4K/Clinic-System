<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Patient extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $guarded = [];

    protected $appends = ['patient_identifier'];

    public function numberingProfile(): BelongsTo
    {
        return $this->belongsTo(PatientNumberingProfile::class, 'patient_numbering_profile_id');
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function getPatientIdentifierAttribute(): string
    {
        if ($this->patient_code) {
            return $this->patient_code;
        }

        return (string) $this->patient_no.(string) $this->patient_series;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                // Safe identifying fields — clinical free-text (known_allergies) excluded.
                'patient_no', 'patient_series', 'patient_code', 'patient_category', 'patient_numbering_profile_id',
                'name', 'guardian_name', 'guardian_relationship', 'guardian_relationship_custom',
                'gender', 'age_years', 'age_months', 'age_days', 'dob', 'phone', 'address',
                'blood_group', 'referred_by',
            ])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function getAgeSummaryAttribute(): string
    {
        $parts = [];
        if (! is_null($this->age_years) && $this->age_years > 0) {
            $parts[] = "{$this->age_years} Y";
        }
        if (! is_null($this->age_months) && $this->age_months > 0) {
            $parts[] = "{$this->age_months} M";
        }
        if ((is_null($this->age_years) || $this->age_years == 0) && ! is_null($this->age_days) && $this->age_days > 0) {
            $parts[] = "{$this->age_days} D";
        }

        if (empty($parts)) {
            return ! is_null($this->age_years) && $this->age_years == 0 ? '0 Y' : 'N/A';
        }

        return implode(' ', $parts);
    }
}
