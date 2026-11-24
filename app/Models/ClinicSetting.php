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
        'auto_deduct_inventory' => 'boolean',
        'default_consultation_fee' => 'decimal:2',
        'sms_config' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty()->dontSubmitEmptyLogs();
    }

    public function isHomeopathyOnly(): bool
    {
        return ($this->practice_type ?? 'homeopathy') === 'homeopathy';
    }

    public function isGeneralPracticeOnly(): bool
    {
        return ($this->practice_type ?? 'homeopathy') === 'general_practice';
    }

    public function isDualPractice(): bool
    {
        return ($this->practice_type ?? 'homeopathy') === 'integrative_dual';
    }

    /**
     * @return array<string, array{label: string, visible: bool, required: bool, order: int, max_length?: int}>
     */
    public static function defaultPatientFormConfig(): array
    {
        return [
            'name' => ['label' => 'Patient Full Name', 'visible' => true, 'required' => true, 'order' => 1],
            'old_or_other_id' => ['label' => 'Old/Other ID', 'visible' => true, 'required' => false, 'order' => 2, 'max_length' => 50],
            'guardian_relationship' => ['label' => 'Relationship to Patient', 'visible' => true, 'required' => false, 'order' => 3],
            'guardian_name' => ['label' => 'Guardian / Primary Contact Name', 'visible' => true, 'required' => false, 'order' => 4],
            'gender' => ['label' => 'Gender', 'visible' => true, 'required' => true, 'order' => 5],
            'age_years' => ['label' => 'Years', 'visible' => true, 'required' => false, 'order' => 6],
            'age_months' => ['label' => 'Months', 'visible' => true, 'required' => false, 'order' => 6],
            'age_days' => ['label' => 'Days', 'visible' => true, 'required' => false, 'order' => 6],
            'dob' => ['label' => 'Date of Birth', 'visible' => true, 'required' => false, 'order' => 7],
            'phone' => ['label' => 'Mobile Phone Number', 'visible' => true, 'required' => false, 'order' => 8],
            'referred_by' => ['label' => 'Referred By', 'visible' => true, 'required' => false, 'order' => 9],
            'address' => ['label' => 'Residential Address / Village & Area', 'visible' => true, 'required' => false, 'order' => 10],
            'blood_group' => ['label' => 'Blood Group', 'visible' => true, 'required' => false, 'order' => 11],
            'known_allergies' => ['label' => 'Known Allergies / Sensitivities', 'visible' => true, 'required' => false, 'order' => 12],
            'medical_history' => ['label' => 'Medical History / অতীত চিকিৎসা ইতিহাস', 'visible' => true, 'required' => false, 'order' => 13],
            'reference_number' => ['label' => 'Reference Number', 'visible' => true, 'required' => false, 'order' => 14, 'max_length' => 100],
            'manual_last_visit_date' => ['label' => 'Last Visit Date (Migration) / শেষ সাক্ষাতের তারিখ', 'visible' => false, 'required' => false, 'order' => 15],
            'legacy_visits_count' => ['label' => 'Past Visits Count (Migration) / পূর্ববর্তী সাক্ষাতের সংখ্যা', 'visible' => false, 'required' => false, 'order' => 16],
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
            'old_or_other_id' => ['old_or_other_id'],
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
            'medical_history' => ['medical_history'],
            'reference_number' => ['reference_number'],
            'manual_last_visit_date' => ['manual_last_visit_date'],
            'legacy_visits_count' => ['legacy_visits_count'],
        ];
    }

    /**
     * @return list<array{key: string, name: string, label: string, visible: bool, is_core: bool, order: int}>
     */
    public static function defaultPatientFormSections(): array
    {
        return [
            [
                'key' => 'identity',
                'name' => 'Identity',
                'label' => 'Identity & Demographics',
                'visible' => true,
                'is_core' => true,
                'order' => 1,
            ],
            [
                'key' => 'medical_background',
                'name' => 'Medical background',
                'label' => 'Medical Background (চিকিৎসা ইতিহাস)',
                'visible' => true,
                'is_core' => false,
                'order' => 2,
            ],
            [
                'key' => 'contact',
                'name' => 'Contact',
                'label' => 'Contact & Residential Location',
                'visible' => true,
                'is_core' => false,
                'order' => 3,
            ],
            [
                'key' => 'legacy_migration',
                'name' => 'Legacy migration',
                'label' => 'Legacy Migration & Historical Records',
                'visible' => true,
                'is_core' => false,
                'order' => 4,
            ],
        ];
    }

    /**
     * @return list<array{key: string, name: string, label: string, visible: bool, is_core: bool, order: int}>
     */
    public static function currentPatientFormSections(): array
    {
        return static::query()->first()?->getPatientFormSections() ?? self::defaultPatientFormSections();
    }

    /**
     * @return list<array{key: string, name: string, label: string, visible: bool, is_core: bool, order: int}>
     */
    public function getPatientFormSections(): array
    {
        $defaults = self::defaultPatientFormSections();
        $storedSections = $this->patient_form_config['sections'] ?? null;

        if (! is_array($storedSections)) {
            return $defaults;
        }

        $defaultsByKey = collect($defaults)->keyBy('key')->all();
        $sections = [];

        foreach ($storedSections as $index => $stored) {
            if (! is_array($stored) || ! isset($stored['key']) || ! isset($defaultsByKey[$stored['key']])) {
                continue;
            }

            $key = $stored['key'];
            $default = $defaultsByKey[$key];

            $sections[] = [
                'key' => $key,
                'name' => $default['name'],
                'label' => is_string($stored['label'] ?? null) && trim($stored['label']) !== ''
                    ? trim($stored['label'])
                    : $default['label'],
                'visible' => $default['is_core'] ? true : (bool) ($stored['visible'] ?? $default['visible']),
                'is_core' => $default['is_core'],
                'order' => isset($stored['order']) ? (int) $stored['order'] : ($index + 1),
            ];
            unset($defaultsByKey[$key]);
        }

        $nextOrder = count($sections) + 1;
        foreach ($defaultsByKey as $remaining) {
            $remaining['order'] = $nextOrder++;
            $sections[] = $remaining;
        }

        usort($sections, fn (array $first, array $second): int => $first['order'] <=> $second['order']);

        foreach ($sections as $i => &$sec) {
            $sec['order'] = $i + 1;
        }
        unset($sec);

        return array_values($sections);
    }

    /**
     * @return list<string>
     */
    public static function patientFormSections(): array
    {
        $sections = static::currentPatientFormSections();

        return array_values(array_map(fn (array $section): string => $section['name'], $sections));
    }

    /**
     * @return array<string, string>
     */
    public static function patientFieldSections(): array
    {
        return [
            'name' => 'Identity',
            'old_or_other_id' => 'Identity',
            'reference_number' => 'Identity',
            'guardian_relationship' => 'Identity',
            'guardian_name' => 'Identity',
            'gender' => 'Identity',
            'age_years' => 'Identity',
            'age_months' => 'Identity',
            'age_days' => 'Identity',
            'dob' => 'Identity',
            'blood_group' => 'Medical background',
            'known_allergies' => 'Medical background',
            'medical_history' => 'Medical background',
            'phone' => 'Contact',
            'referred_by' => 'Contact',
            'address' => 'Contact',
            'manual_last_visit_date' => 'Legacy migration',
            'legacy_visits_count' => 'Legacy migration',
        ];
    }

    /**
     * @return array{mode: string, prefix: string, number_padding: int, allow_staff_override: bool, max_length: int}
     */
    public static function defaultOldOrOtherIdConfig(): array
    {
        return [
            'mode' => 'auto',
            'prefix' => 'OLD-',
            'number_padding' => 4,
            'allow_staff_override' => true,
            'max_length' => 50,
        ];
    }

    /**
     * @return array{mode: string, prefix: string, number_padding: int, allow_staff_override: bool, max_length: int}
     */
    public static function currentOldOrOtherIdConfig(): array
    {
        $settings = static::query()->first();
        $defaults = self::defaultOldOrOtherIdConfig();

        if (! $settings) {
            return $defaults;
        }

        $stored = $settings->patient_form_config['old_or_other_id_numbering']
            ?? $settings->patient_form_config['fields']['old_or_other_id']
            ?? [];

        return [
            'mode' => in_array($stored['mode'] ?? '', ['auto', 'manual'], true) ? $stored['mode'] : $defaults['mode'],
            'prefix' => array_key_exists('prefix', $stored) ? (string) $stored['prefix'] : $defaults['prefix'],
            'number_padding' => max(0, min(10, (int) ($stored['number_padding'] ?? $defaults['number_padding']))),
            'allow_staff_override' => (bool) ($stored['allow_staff_override'] ?? $defaults['allow_staff_override']),
            'max_length' => min(255, max(1, (int) ($stored['max_length'] ?? $defaults['max_length']))),
        ];
    }

    /**
     * @return array<string, array{label: string, visible: bool, required: bool, order: int, max_length?: int}>
     */
    public static function currentPatientFormConfig(): array
    {
        return static::query()->first()?->getPatientFormConfig() ?? self::defaultPatientFormConfig();
    }

    /**
     * @return array<string, array{label: string, visible: bool, required: bool, order: int, max_length?: int}>
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

            if ($key === 'reference_number' || $key === 'old_or_other_id') {
                $maxLen = $saved['max_length'] ?? ($storedConfig['old_or_other_id_numbering']['max_length'] ?? $default['max_length']);
                $config[$key]['max_length'] = min(255, max(1, (int) $maxLen));
            }

            if ($key === 'guardian_name' && $config[$key]['label'] === 'Contact Name') {
                $config[$key]['label'] = $default['label'];
            }
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

    /**
     * Default SMS and communication gateway configuration.
     *
     * @return array<string, mixed>
     */
    public static function defaultSmsConfig(): array
    {
        return [
            'sms_enabled' => false,
            'sms_provider' => 'log',
            'api_url' => '',
            'api_key' => '',
            'sender_id' => 'RemediQ',
            'auto_sms_appointments' => true,
            'auto_sms_queue' => true,
            'auto_sms_prescriptions' => false,
            'templates' => [
                'appointment_confirmed' => 'Dear {patient_name}, your appointment with {doctor_name} at {clinic_name} is confirmed for {date} at {time}. Helpline: {phone}',
                'queue_token_issued' => 'Token {token_code} issued for {patient_name} at {clinic_name}. Assigned to {doctor_name} ({service_room}). Please watch waiting room display.',
                'prescription_ready' => 'Dear {patient_name}, your digital prescription from {clinic_name} by {doctor_name} is ready. View online: {prescription_url}',
            ],
        ];
    }

    /**
     * Get SMS configuration with defaults merged.
     *
     * @return array<string, mixed>
     */
    public function getSmsConfig(): array
    {
        $defaults = self::defaultSmsConfig();
        $stored = $this->sms_config;

        if (empty($stored) || ! is_array($stored)) {
            return $defaults;
        }

        return array_replace_recursive($defaults, $stored);
    }
}
