<?php

namespace App\Models;

use Database\Factories\PatientNumberingProfileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientNumberingProfile extends Model
{
    /** @use HasFactory<PatientNumberingProfileFactory> */
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'include_year' => 'boolean',
            'reset_annually' => 'boolean',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
        ];
    }

    public function sequences(): HasMany
    {
        return $this->hasMany(PatientNumberingSequence::class);
    }

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    public function seriesFor(?int $year = null): string
    {
        $parts = [$this->prefix];

        if ($this->include_year) {
            $parts[] = (string) ($year ?? now()->year);
        }

        if ($this->category_code) {
            $parts[] = $this->category_code;
        }

        return implode($this->separator, $parts);
    }

    public function formatPatientIdentifier(int $number, ?int $year = null): string
    {
        $numberLabel = $this->number_padding > 0
            ? str_pad((string) $number, $this->number_padding, '0', STR_PAD_LEFT)
            : (string) $number;

        return $this->seriesFor($year).$this->separator.$numberLabel;
    }

    public function getCurrentPrefixAttribute(): string
    {
        return $this->seriesFor();
    }
}
