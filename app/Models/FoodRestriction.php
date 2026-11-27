<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class FoodRestriction extends Model
{
    use HasFactory, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function visits(): BelongsToMany
    {
        return $this->belongsToMany(Visit::class, 'visit_food_restriction', 'food_restriction_id', 'visit_id');
    }

    public function scopeSearch($query, ?string $search)
    {
        if (blank($search)) {
            return $query;
        }

        $search = trim($search);

        return $query->where(function ($q) use ($search) {
            $q->where('text_bn', 'like', "%{$search}%")
                ->orWhere('text_en', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%");
        });
    }

    public function scopeCategory($query, ?string $category)
    {
        if (blank($category) || $category === 'all') {
            return $query;
        }

        return $query->where('category', $category);
    }

    public function scopeActive($query, bool $active = true)
    {
        return $query->where('is_active', $active);
    }

    public function scopeDefault($query, bool $default = true)
    {
        return $query->where('is_default', $default);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['text_bn', 'text_en', 'category', 'is_default', 'is_active', 'sort_order'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
