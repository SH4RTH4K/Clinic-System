<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Medicine extends Model
{
    use HasFactory, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'stock_qty' => 'integer',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty()->dontSubmitEmptyLogs();
    }

    public function batches(): HasMany
    {
        return $this->hasMany(MedicineBatch::class, 'medicine_id')->where('item_type', 'remedy');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (blank($term)) {
            return $query;
        }

        return $query->where(function (Builder $sub) use ($term): void {
            $sub->where('name', 'like', "%{$term}%")
                ->orWhere('potency', 'like', "%{$term}%")
                ->orWhere('form', 'like', "%{$term}%")
                ->orWhere('default_instruction', 'like', "%{$term}%");
        });
    }

    public function scopeScale(Builder $query, ?string $scale): Builder
    {
        if (blank($scale) || $scale === 'all') {
            return $query;
        }

        return match (strtolower($scale)) {
            'ch' => $query->where(function (Builder $sub): void {
                $sub->where('potency', 'like', '%C%')
                    ->orWhere('potency', 'like', '%CH%')
                    ->orWhere('potency', 'like', '%M%');
            })->where('potency', 'not like', '%LM%'),
            'lm' => $query->where(function (Builder $sub): void {
                $sub->where('potency', 'like', '%LM%')
                    ->orWhere('potency', 'like', '0/%')
                    ->orWhere('potency', 'like', 'LM%');
            }),
            'x' => $query->where(function (Builder $sub): void {
                $sub->where('potency', 'like', '%X%')
                    ->orWhere('potency', 'like', '%D%')
                    ->orWhere('potency', 'like', '%DH%');
            }),
            'q' => $query->where(function (Builder $sub): void {
                $sub->where('potency', 'like', '%Q%')
                    ->orWhere('potency', 'like', '%MT%')
                    ->orWhere('potency', 'like', '%Ø%')
                    ->orWhere('potency', 'like', '%Tincture%');
            }),
            default => $query,
        };
    }
}
