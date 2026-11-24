<?php

namespace App\Models;

use Database\Factories\PatientVitalFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientVital extends Model
{
    /** @use HasFactory<PatientVitalFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected $appends = [
        'bmi_category',
        'blood_pressure_category',
        'blood_pressure_formatted',
    ];

    protected function casts(): array
    {
        return [
            'bp_systolic' => 'integer',
            'bp_diastolic' => 'integer',
            'pulse_rate' => 'integer',
            'temperature_f' => 'float',
            'respiratory_rate' => 'integer',
            'spo2' => 'integer',
            'weight_kg' => 'float',
            'height_cm' => 'float',
            'bmi' => 'float',
            'blood_sugar_rbs' => 'float',
            'blood_sugar_fbs' => 'float',
            'recorded_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Calculate BMI given weight in kg and height in cm.
     */
    public static function calculateBmi(?float $weightKg, ?float $heightCm): ?float
    {
        if (! $weightKg || ! $heightCm || $heightCm <= 0) {
            return null;
        }

        $heightM = $heightCm / 100.0;

        return round($weightKg / ($heightM * $heightM), 1);
    }

    public function getBmiCategoryAttribute(): ?string
    {
        if ($this->bmi === null) {
            return null;
        }

        if ($this->bmi < 18.5) {
            return 'Underweight';
        }
        if ($this->bmi < 25.0) {
            return 'Normal';
        }
        if ($this->bmi < 30.0) {
            return 'Overweight';
        }

        return 'Obese';
    }

    public function getBloodPressureFormattedAttribute(): ?string
    {
        if ($this->bp_systolic === null && $this->bp_diastolic === null) {
            return null;
        }

        return ($this->bp_systolic ?? '--').'/'.($this->bp_diastolic ?? '--').' mmHg';
    }

    public function getBloodPressureCategoryAttribute(): ?string
    {
        if ($this->bp_systolic === null || $this->bp_diastolic === null) {
            return null;
        }

        $sys = $this->bp_systolic;
        $dia = $this->bp_diastolic;

        if ($sys > 180 || $dia > 120) {
            return 'Crisis';
        }
        if ($sys >= 140 || $dia >= 90) {
            return 'Stage 2 HTN';
        }
        if ($sys >= 130 || $dia >= 80) {
            return 'Stage 1 HTN';
        }
        if ($sys >= 120 && $dia < 80) {
            return 'Elevated';
        }

        return 'Normal';
    }
}
