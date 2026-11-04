<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var array<string, string> */
    private const COLUMNS = [
        'hero_title_1' => 'string',
        'hero_title_2' => 'string',
        'hero_title_3' => 'string',
        'hero_subtitle' => 'string',
        'hero_description' => 'text',
        'hero_title_1_bn' => 'string',
        'hero_title_2_bn' => 'string',
        'hero_title_3_bn' => 'string',
        'hero_subtitle_bn' => 'string',
        'hero_description_bn' => 'text',
        'social_facebook' => 'string',
        'social_twitter' => 'string',
        'social_youtube' => 'string',
        'social_instagram' => 'string',
    ];

    /** @var array<string, string> */
    private const SETTINGS_FIELDS = [
        'hero_title_1' => 'hero_title_1',
        'hero_title_2' => 'hero_title_2',
        'hero_title_3' => 'hero_title_3',
        'hero_subtitle' => 'hero_subtitle',
        'hero_description' => 'hero_description',
        'hero_title_1_bn' => 'hero_title_1_bn',
        'hero_title_2_bn' => 'hero_title_2_bn',
        'hero_title_3_bn' => 'hero_title_3_bn',
        'hero_subtitle_bn' => 'hero_subtitle_bn',
        'hero_description_bn' => 'hero_description_bn',
        'social_facebook' => 'social_facebook',
        'social_twitter' => 'social_twitter',
        'social_youtube' => 'social_youtube',
        'social_instagram' => 'social_instagram',
        'credentials' => 'doctor_credentials',
        'govt_reg_no' => 'govt_reg_no',
        'phone' => 'phone',
    ];

    public function up(): void
    {
        $this->addMissingColumns();
        $this->assertColumnDefinitions();
        $this->transferSettingsOnlyToAnIdentifiedDoctor();
    }

    public function down(): void
    {
        $populatedColumn = collect(array_keys(self::COLUMNS))->first(
            fn (string $column): bool => DB::table('doctors')->whereNotNull($column)->where($column, '<>', '')->exists()
        );

        if ($populatedColumn !== null) {
            throw new RuntimeException("Doctor profile data exists in doctors.{$populatedColumn}; this migration cannot be rolled back without losing it.");
        }

        $existingColumns = array_values(array_filter(
            array_keys(self::COLUMNS),
            fn (string $column): bool => Schema::hasColumn('doctors', $column)
        ));
        if ($existingColumns !== []) {
            Schema::table('doctors', function (Blueprint $table) use ($existingColumns): void {
                $table->dropColumn($existingColumns);
            });
        }
    }

    private function addMissingColumns(): void
    {
        if (! Schema::hasTable('doctors')) {
            throw new RuntimeException('The doctors table is unavailable. This migration cannot safely add clinician profile fields.');
        }

        foreach (self::COLUMNS as $column => $type) {
            if (Schema::hasColumn('doctors', $column)) {
                continue;
            }

            Schema::table('doctors', function (Blueprint $table) use ($column, $type): void {
                if ($type === 'text') {
                    $table->text($column)->nullable();
                } else {
                    $table->string($column)->nullable();
                }
            });
        }
    }

    private function assertColumnDefinitions(): void
    {
        foreach (self::COLUMNS as $columnName => $expectedType) {
            $column = collect(Schema::getColumns('doctors'))->firstWhere('name', $columnName);
            $actualType = strtolower((string) ($column['type_name'] ?? $column['type'] ?? ''));
            $typeMatches = $expectedType === 'text'
                ? str_contains($actualType, 'text')
                : str_contains($actualType, 'varchar') || str_contains($actualType, 'character varying');

            if ($column === null || ! $column['nullable'] || ! $typeMatches) {
                throw new RuntimeException("The doctors.{$columnName} field is incompatible with the expected nullable {$expectedType} definition. Manual review is required.");
            }
        }
    }

    private function transferSettingsOnlyToAnIdentifiedDoctor(): void
    {
        if (! Schema::hasTable('clinic_settings')) {
            return;
        }

        $settings = DB::table('clinic_settings')->orderBy('id')->first();
        if ($settings === null) {
            return;
        }

        $doctorValues = [];
        foreach (self::SETTINGS_FIELDS as $doctorColumn => $settingsColumn) {
            if (! Schema::hasColumn('clinic_settings', $settingsColumn)) {
                continue;
            }

            $value = $settings->{$settingsColumn} ?? null;
            if (is_string($value) && trim($value) !== '') {
                $doctorValues[$doctorColumn] = $value;
            }
        }

        if ($doctorValues === []) {
            return;
        }

        $doctors = DB::table('doctors')
            ->orderBy('id')
            ->get(array_merge(['id', 'name', 'credentials', 'govt_reg_no', 'phone'], array_keys(self::COLUMNS)));
        if ($doctors->count() !== 1) {
            throw new RuntimeException('Clinic settings contain Doctor profile information, but one unambiguous matching Doctor profile is not available. Select the recipient manually; no Doctor was created or updated.');
        }

        $doctor = $doctors->first();
        $settingsDoctorName = Schema::hasColumn('clinic_settings', 'doctor_name')
            ? trim((string) ($settings->doctor_name ?? ''))
            : '';
        if ($settingsDoctorName === '' || mb_strtolower(trim((string) $doctor->name)) !== mb_strtolower($settingsDoctorName)) {
            throw new RuntimeException('Clinic settings Doctor identity does not match the existing Doctor profile. Review the identity manually; no Doctor data was transferred.');
        }

        $updates = [];
        foreach ($doctorValues as $doctorColumn => $value) {
            if (blank($doctor->{$doctorColumn})) {
                $updates[$doctorColumn] = $value;
            }
        }

        if ($updates !== []) {
            $updates['updated_at'] = now();
            DB::table('doctors')->where('id', $doctor->id)->update($updates);
        }
    }
};
