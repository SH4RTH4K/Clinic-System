<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class MedicineBatch extends Model
{
    use HasFactory, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'expiry_date' => 'date',
        'purchase_date' => 'date',
        'purchase_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'initial_quantity' => 'decimal:2',
        'current_quantity' => 'decimal:2',
        'reorder_level' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'item_name',
        'is_low_stock',
        'is_expired',
        'is_expiring_soon',
        'days_until_expiry',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty()->dontSubmitEmptyLogs();
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    public function pharmaceutical(): BelongsTo
    {
        return $this->belongsTo(Pharmaceutical::class);
    }

    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class)->latest();
    }

    // ── Accessors ───────────────────────────────────────────────

    public function getItemNameAttribute(): string
    {
        if ($this->item_type === 'remedy') {
            $name = $this->medicine?->name ?? 'Remedy';
            if ($this->potency) {
                $name .= ' '.$this->potency;
            }
            if ($this->form) {
                $name .= ' ('.ucwords(str_replace('_', ' ', $this->form)).')';
            }

            return $name;
        }

        $pharma = $this->pharmaceutical;
        if (! $pharma) {
            return 'Pharmaceutical';
        }

        $title = $pharma->brand_name ?: $pharma->generic_name;
        if ($pharma->strength) {
            $title .= ' '.$pharma->strength;
        }
        if ($pharma->dosage_form) {
            $title .= ' ['.ucfirst($pharma->dosage_form).']';
        }

        return $title;
    }

    public function getIsLowStockAttribute(): bool
    {
        return (float) $this->current_quantity <= (float) $this->reorder_level;
    }

    public function getIsExpiredAttribute(): bool
    {
        if (! $this->expiry_date) {
            return false;
        }

        return $this->expiry_date->isPast();
    }

    public function getIsExpiringSoonAttribute(): bool
    {
        if (! $this->expiry_date) {
            return false;
        }

        return ! $this->expiry_date->isPast() && $this->expiry_date->lte(now()->addDays(30));
    }

    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (! $this->expiry_date) {
            return null;
        }

        return (int) now()->startOfDay()->diffInDays($this->expiry_date->startOfDay(), false);
    }

    // ── Scopes ──────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeRemedies(Builder $query): Builder
    {
        return $query->where('item_type', 'remedy');
    }

    public function scopePharmaceuticals(Builder $query): Builder
    {
        return $query->where('item_type', 'pharmaceutical');
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('current_quantity', '<=', 'reorder_level');
    }

    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', now())
            ->whereDate('expiry_date', '<=', now()->addDays($days));
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<', now());
    }
}
