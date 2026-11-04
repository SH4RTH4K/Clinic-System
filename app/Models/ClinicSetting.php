<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ClinicSetting extends Model
{
    use HasFactory, LogsActivity;

    protected $guarded = [];

    protected $casts = [
        'visiting_hours_schedule' => 'array',
        'prescription_config' => 'array',
        'patient_form_config' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty()->dontSubmitEmptyLogs();
    }

    /**
     * @return array<string, array{label: string, visible: bool, required: bool, order: int}>
     */
    public static function defaultPatientFormConfig(): array
    {
        return [
            'name' => ['label' => 'Patient Full Name', 'visible' => true, 'required' => true, 'order' => 1],
            'guardian_relationship' => ['label' => 'Relationship to Patient', 'visible' => true, 'required' => false, 'order' => 2],
            'guardian_name' => ['label' => 'Contact Name', 'visible' => true, 'required' => false, 'order' => 3],
            'gender' => ['label' => 'Gender', 'visible' => true, 'required' => true, 'order' => 4],
            'age_years' => ['label' => 'Years', 'visible' => true, 'required' => false, 'order' => 5],
            'age_months' => ['label' => 'Months', 'visible' => true, 'required' => false, 'order' => 5],
            'age_days' => ['label' => 'Days', 'visible' => true, 'required' => false, 'order' => 5],
            'dob' => ['label' => 'Date of Birth', 'visible' => true, 'required' => false, 'order' => 6],
            'phone' => ['label' => 'Mobile Phone Number', 'visible' => true, 'required' => false, 'order' => 7],
            'referred_by' => ['label' => 'Referred By', 'visible' => true, 'required' => false, 'order' => 8],
            'address' => ['label' => 'Residential Address / Village & Area', 'visible' => true, 'required' => false, 'order' => 9],
            'blood_group' => ['label' => 'Blood Group', 'visible' => true, 'required' => false, 'order' => 10],
            'known_allergies' => ['label' => 'Known Allergies / Sensitivities', 'visible' => true, 'required' => false, 'order' => 11],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function defaultPatientRelationshipOptions(): array
    {
        return [
            ['value' => 'father', 'label' => 'Father'],
            ['value' => 'mother', 'label' => 'Mother'],
            ['value' => 'spouse', 'label' => 'Spouse'],
            ['value' => 'son', 'label' => 'Son'],
            ['value' => 'daughter', 'label' => 'Daughter'],
            ['value' => 'brother', 'label' => 'Brother'],
            ['value' => 'sister', 'label' => 'Sister'],
            ['value' => 'grandfather', 'label' => 'Grandfather'],
            ['value' => 'grandmother', 'label' => 'Grandmother'],
            ['value' => 'grandson', 'label' => 'Grandson'],
            ['value' => 'granddaughter', 'label' => 'Granddaughter'],
            ['value' => 'uncle', 'label' => 'Uncle'],
            ['value' => 'aunt', 'label' => 'Aunt'],
            ['value' => 'cousin', 'label' => 'Cousin'],
            ['value' => 'legal_guardian', 'label' => 'Legal guardian'],
            ['value' => 'caregiver', 'label' => 'Caregiver'],
            ['value' => 'friend', 'label' => 'Friend'],
            ['value' => 'neighbor', 'label' => 'Neighbor'],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function currentPatientRelationshipOptions(): array
    {
        return static::query()->first()?->getPatientRelationshipOptions() ?? self::defaultPatientRelationshipOptions();
    }

    /**
     * @return array<string, list<string>>
     */
    public static function patientFormFieldOrderGroups(): array
    {
        return [
            'name' => ['name'],
            'guardian_relationship' => ['guardian_relationship'],
            'guardian_name' => ['guardian_name'],
            'gender' => ['gender'],
            'age_years' => ['age_years', 'age_months', 'age_days'],
            'dob' => ['dob'],
            'phone' => ['phone'],
            'referred_by' => ['referred_by'],
            'address' => ['address'],
            'blood_group' => ['blood_group'],
            'known_allergies' => ['known_allergies'],
        ];
    }

    /**
     * @return array<string, array{label: string, visible: bool, required: bool, order: int}>
     */
    public static function currentPatientFormConfig(): array
    {
        return static::query()->first()?->getPatientFormConfig() ?? self::defaultPatientFormConfig();
    }

    /**
     * @return array<string, array{label: string, visible: bool, required: bool, order: int}>
     */
    public function getPatientFormConfig(): array
    {
        $defaults = self::defaultPatientFormConfig();
        $storedConfig = $this->patient_form_config ?? [];
        $savedConfig = $storedConfig['fields'] ?? $storedConfig;
        $config = [];

        foreach ($defaults as $key => $default) {
            $saved = $savedConfig[$key] ?? [];
            $config[$key] = [
                'label' => is_string($saved['label'] ?? null) && trim($saved['label']) !== ''
                    ? trim($saved['label'])
                    : $default['label'],
                'visible' => in_array($key, ['name', 'gender'], true) ? true : (bool) ($saved['visible'] ?? $default['visible']),
                'required' => in_array($key, ['name', 'gender'], true) ? true : (bool) ($saved['required'] ?? $default['required']),
                'order' => max(1, (int) ($saved['order'] ?? $default['order'])),
            ];
        }

        return $config;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function getPatientRelationshipOptions(): array
    {
        $storedOptions = $this->patient_form_config['relationships'] ?? null;

        if (! is_array($storedOptions)) {
            return self::defaultPatientRelationshipOptions();
        }

        return array_values(array_filter(array_map(
            fn (mixed $option): ?array => is_array($option) && isset($option['value'], $option['label'])
                ? [
                    'value' => (string) $option['value'],
                    'label' => (string) $option['label'],
                ]
                : null,
            $storedOptions,
        )));
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
