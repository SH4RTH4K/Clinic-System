<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class ClinicSetting extends Model
{
    use HasFactory, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'visiting_hours_schedule' => 'array',
        'prescription_config' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty()->dontLogEmptyChanges();
    }

    /**
     * Default prescription pad configuration options.
     *
     * @return array<string, mixed>
     */
    public static function defaultPrescriptionConfig(): array
    {
        return [
            'timing_options' => [
                ['key' => 'morning', 'label_en' => 'Morning', 'label_bn' => 'সকাল'],
                ['key' => 'noon', 'label_en' => 'Noon', 'label_bn' => 'দুপুর'],
                ['key' => 'afternoon', 'label_en' => 'Afternoon', 'label_bn' => 'বিকাল'],
                ['key' => 'night', 'label_en' => 'Night', 'label_bn' => 'রাত'],
                ['key' => 'bedtime', 'label_en' => 'Bedtime', 'label_bn' => 'ঘুমানোর পূর্বে'],
            ],
            'dose_units' => [
                ['key' => 'drops', 'label_en' => 'Drops', 'label_bn' => 'ফোটা'],
                ['key' => 'pills', 'label_en' => 'Pills', 'label_bn' => 'বটিকা'],
                ['key' => 'tablets', 'label_en' => 'Tablets', 'label_bn' => 'ট্যাবলেট'],
                ['key' => 'powder', 'label_en' => 'Powder', 'label_bn' => 'পুরিয়া'],
                ['key' => 'spoon', 'label_en' => 'Spoon / Tsp', 'label_bn' => 'চামচ'],
                ['key' => 'ml', 'label_en' => 'ml', 'label_bn' => 'মিলি'],
                ['key' => 'globules', 'label_en' => 'Globules', 'label_bn' => 'গ্লোবিউলস'],
            ],
            'meal_relations' => [
                ['key' => 'before', 'label_en' => 'Before meal', 'label_bn' => 'আগে (Before)'],
                ['key' => 'after', 'label_en' => 'After meal', 'label_bn' => 'পরে (After)'],
                ['key' => 'with', 'label_en' => 'With meal', 'label_bn' => 'খাবারের সাথে'],
                ['key' => 'empty_stomach', 'label_en' => 'Empty stomach', 'label_bn' => 'খালি পেটে'],
            ],
            'dilution_instructions' => [
                'with half a cup of water',
                'আধা কাপ পানির সাথে মিশিয়ে',
                'directly on tongue (জিহ্বায় সরাসরি)',
                'chew or dissolve in mouth (চুষে খাবেন)',
                'with lukewarm water (কুসুম গরম পানির সাথে)',
                'empty stomach in the morning (সকালে খালি পেটে)',
            ],
            'duration_presets' => [3, 5, 7, 10, 14, 15, 21, 30],
            'default_duration_days' => 7,
            'default_dose_qty' => 5,
            'default_dose_unit' => 'drops',
        ];
    }

    /**
     * Get prescription configuration with defaults merged.
     *
     * @return array<string, mixed>
     */
    public function getPrescriptionConfig(): array
    {
        $defaults = self::defaultPrescriptionConfig();
        $stored = $this->prescription_config;

        if (empty($stored) || ! is_array($stored)) {
            return $defaults;
        }

        return [
            'timing_options' => ! empty($stored['timing_options']) ? $stored['timing_options'] : $defaults['timing_options'],
            'dose_units' => ! empty($stored['dose_units']) ? $stored['dose_units'] : $defaults['dose_units'],
            'meal_relations' => ! empty($stored['meal_relations']) ? $stored['meal_relations'] : $defaults['meal_relations'],
            'dilution_instructions' => ! empty($stored['dilution_instructions']) ? $stored['dilution_instructions'] : $defaults['dilution_instructions'],
            'duration_presets' => ! empty($stored['duration_presets']) ? $stored['duration_presets'] : $defaults['duration_presets'],
            'default_duration_days' => $stored['default_duration_days'] ?? $defaults['default_duration_days'],
            'default_dose_qty' => $stored['default_dose_qty'] ?? $defaults['default_dose_qty'],
            'default_dose_unit' => $stored['default_dose_unit'] ?? $defaults['default_dose_unit'],
        ];
    }
}
