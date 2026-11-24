<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Patient extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $guarded = [];

    protected $appends = ['patient_identifier', 'photo_url'];

    public function numberingProfile(): BelongsTo
    {
        return $this->belongsTo(PatientNumberingProfile::class, 'patient_numbering_profile_id');
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function vitals(): HasMany
    {
        return $this->hasMany(PatientVital::class)->latest();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(PatientAttachment::class)->latest();
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (empty($this->photo_path)) {
            return null;
        }

        return Storage::disk('public')->url($this->photo_path);
    }

    /**
     * Scope a query to search patients by name, guardian, phone, or identifiers.
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = trim($term);

        if ($term === '') {
            return $query;
        }

        return $query->where(function (Builder $q) use ($term): void {
            $q->where('name', 'like', '%'.$term.'%')
                ->orWhere('guardian_name', 'like', '%'.$term.'%')
                ->orWhere('phone', 'like', '%'.$term.'%')
                ->orWhere('patient_no', 'like', '%'.$term.'%')
                ->orWhere('patient_series', 'like', '%'.$term.'%')
                ->orWhere('patient_code', 'like', '%'.$term.'%')
                ->orWhere('old_or_other_id', 'like', '%'.$term.'%');
        });
    }

    /**
     * Generate the next sequential Old/Other ID using the configured or default prefix and padding.
     */
    public static function generateNextOldOrOtherId(?string $prefix = null, ?int $padding = null): string
    {
        $config = ClinicSetting::currentOldOrOtherIdConfig();
        $prefix = $prefix ?? $config['prefix'];
        $padding = $padding ?? $config['number_padding'];

        $existing = static::withTrashed()
            ->whereNotNull('old_or_other_id')
            ->where('old_or_other_id', 'like', $prefix.'%')
            ->pluck('old_or_other_id');

        $max = 0;
        foreach ($existing as $val) {
            $suffix = substr((string) $val, strlen($prefix));
            if (is_numeric($suffix)) {
                $num = (int) $suffix;
                if ($num > $max) {
                    $max = $num;
                }
            }
        }

        $next = $max + 1;
        $numberPart = $padding > 0 ? str_pad((string) $next, $padding, '0', STR_PAD_LEFT) : (string) $next;

        return $prefix.$numberPart;
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
            ->logOnly([])
            ->setDescriptionForEvent(fn (string $eventName): string => $this->privacySafeActivityDescription($eventName));
    }

    private function privacySafeActivityDescription(string $eventName): string
    {
        $changedFields = array_values(array_diff(array_keys($this->getDirty()), ['created_at', 'updated_at']));
        $fieldSummary = $changedFields === [] ? '' : ' fields: '.implode(', ', $changedFields);

        return 'patient.'.$eventName.$fieldSummary;
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
