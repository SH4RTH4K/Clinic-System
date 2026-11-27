<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Symptom extends Model
{
    use HasFactory, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty()->dontSubmitEmptyLogs();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeCategory(Builder $query, ?string $category): Builder
    {
        if (blank($category) || $category === 'all') {
            return $query;
        }

        return $query->where('category', $category);
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (blank($term)) {
            return $query;
        }

        return $query->where(function (Builder $sub) use ($term): void {
            $sub->where('name_en', 'like', "%{$term}%")
                ->orWhere('name_bn', 'like', "%{$term}%")
                ->orWhere('code', 'like', "%{$term}%")
                ->orWhere('category', 'like', "%{$term}%")
                ->orWhere('modalities', 'like', "%{$term}%");
        });
    }

    public function medicines(): BelongsToMany
    {
        return $this->belongsToMany(Medicine::class, 'symptom_medicine_map')
            ->withPivot(['priority', 'note', 'review_status', 'is_approved'])
            ->withTimestamps();
    }

    public function symptomMedicineMaps(): HasMany
    {
        return $this->hasMany(SymptomMedicineMap::class);
    }

    public function visits(): BelongsToMany
    {
        return $this->belongsToMany(Visit::class, 'visit_symptom')
            ->withPivot('note');
    }
}
