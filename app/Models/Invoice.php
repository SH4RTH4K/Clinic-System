<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'invoice_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'due_amount' => 'decimal:2',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Recalculate totals based on items, discount, and payments.
     */
    public function recalculateTotals(): self
    {
        $subtotal = (float) $this->items()->sum('total_price');

        $discount = (float) $this->discount_amount;
        if ($this->discount_type === 'percentage') {
            $discount = ($subtotal * $discount) / 100.0;
        }

        $tax = (float) $this->tax_amount;
        $total = max(0.0, $subtotal - $discount + $tax);

        $paid = (float) $this->payments()->sum('amount');
        $due = max(0.0, $total - $paid);

        $status = 'unpaid';
        if ($this->status === 'cancelled') {
            $status = 'cancelled';
        } elseif ($this->status === 'waived') {
            $status = 'waived';
        } elseif ($due <= 0.001 && $total > 0) {
            $status = 'paid';
        } elseif ($paid > 0 && $due > 0.001) {
            $status = 'partially_paid';
        } elseif ($total == 0 && $paid == 0) {
            $status = 'paid';
        }

        $this->update([
            'subtotal' => $subtotal,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'due_amount' => $due,
            'status' => $status,
        ]);

        return $this;
    }

    // Scopes
    public function scopePaid(Builder $query): Builder
    {
        return $query->where('status', 'paid');
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('status', 'unpaid');
    }

    public function scopePartiallyPaid(Builder $query): Builder
    {
        return $query->where('status', 'partially_paid');
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query->where('due_amount', '>', 0)->whereNotIn('status', ['cancelled', 'waived']);
    }

    public function scopeDateRange(Builder $query, string $startDate, string $endDate): Builder
    {
        return $query->whereBetween('invoice_date', [$startDate, $endDate]);
    }
}
