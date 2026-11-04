<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SymptomMedicineMap extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'symptom_medicine_map';

    protected $guarded = [];

    protected $casts = [
        'is_approved' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function symptom(): BelongsTo
    {
        return $this->belongsTo(Symptom::class);
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(SymptomMedicineMapVersion::class)->orderByDesc('version_number');
    }

    public function preserveVersion(int $actorId): void
    {
        $versionNumber = (int) $this->versions()->max('version_number') + 1;
        $this->versions()->create([
            'version_number' => $versionNumber,
            'snapshot' => [
                'symptom_id' => $this->symptom_id,
                'symptom_name' => $this->symptom?->name_en,
                'medicine_id' => $this->medicine_id,
                'medicine_name' => $this->medicine?->name,
                'priority' => $this->priority,
                'note' => $this->note,
                'source_title' => $this->source_title,
                'source_author' => $this->source_author,
                'source_edition' => $this->source_edition,
                'source_page' => $this->source_page,
                'source_url' => $this->source_url,
                'review_status' => $this->review_status,
                'is_approved' => (bool) $this->is_approved,
                'reviewed_by' => $this->reviewed_by,
                'reviewer_name' => $this->reviewer_name,
                'reviewed_at' => $this->reviewed_at?->toIso8601String(),
                'review_note' => $this->review_note,
            ],
            'archived_by' => $actorId,
            'archived_at' => now(),
        ]);
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

        return 'symptom_medicine_map.'.$eventName.$fieldSummary;
    }
}
