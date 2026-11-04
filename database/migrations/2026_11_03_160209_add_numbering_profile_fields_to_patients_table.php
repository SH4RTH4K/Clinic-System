<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PROFILE_COLUMN = 'patient_numbering_profile_id';

    private const CATEGORY_COLUMN = 'patient_category';

    private const CODE_COLUMN = 'patient_code';

    public function up(): void
    {
        if (! Schema::hasTable('patient_numbering_profiles')) {
            throw new RuntimeException('Patient numbering profiles are unavailable. Run their migration successfully before adding patient numbering fields.');
        }

        $this->addMissingColumns();
        $this->assertColumnDefinitions();
        $this->assertProfileForeignKey();
        $this->assertPatientCodeUniqueIndex();
        $this->widenPatientSeriesWithoutChangingValues();
    }

    public function down(): void
    {
        $this->assertNoNumberingDataWouldBeLost();

        $foreignKey = $this->profileForeignKey();
        if ($foreignKey !== null) {
            Schema::table('patients', function (Blueprint $table) use ($foreignKey): void {
                $table->dropForeign($foreignKey['name']);
            });
        }

        $codeIndex = collect(Schema::getIndexes('patients'))->first(
            fn (array $index): bool => $index['unique'] && $index['columns'] === [self::CODE_COLUMN]
        );
        if ($codeIndex !== null) {
            Schema::table('patients', function (Blueprint $table) use ($codeIndex): void {
                $table->dropUnique($codeIndex['name']);
            });
        }

        $columnsToDrop = array_values(array_filter(
            [self::PROFILE_COLUMN, self::CATEGORY_COLUMN, self::CODE_COLUMN],
            fn (string $column): bool => Schema::hasColumn('patients', $column)
        ));
        if ($columnsToDrop !== []) {
            Schema::table('patients', function (Blueprint $table) use ($columnsToDrop): void {
                $table->dropColumn($columnsToDrop);
            });
        }

        if ($this->patientSeriesLength() > 10) {
            Schema::table('patients', function (Blueprint $table): void {
                $table->string('patient_series', 10)->change();
            });
        }
    }

    private function addMissingColumns(): void
    {
        if (! Schema::hasColumn('patients', self::PROFILE_COLUMN)) {
            Schema::table('patients', function (Blueprint $table): void {
                $table->foreignId(self::PROFILE_COLUMN)->nullable();
            });
        }

        if (! Schema::hasColumn('patients', self::CATEGORY_COLUMN)) {
            Schema::table('patients', function (Blueprint $table): void {
                $table->string(self::CATEGORY_COLUMN, 100)->nullable();
            });
        }

        if (! Schema::hasColumn('patients', self::CODE_COLUMN)) {
            Schema::table('patients', function (Blueprint $table): void {
                $table->string(self::CODE_COLUMN, 100)->nullable();
            });
        }
    }

    private function assertColumnDefinitions(): void
    {
        foreach ([self::PROFILE_COLUMN, self::CATEGORY_COLUMN, self::CODE_COLUMN] as $columnName) {
            $column = collect(Schema::getColumns('patients'))->firstWhere('name', $columnName);
            if ($column === null || ! $column['nullable']) {
                throw new RuntimeException("The patients.{$columnName} column is not nullable as required; no existing values were changed.");
            }
        }

        $categoryColumn = collect(Schema::getColumns('patients'))->firstWhere('name', self::CATEGORY_COLUMN);
        $codeColumn = collect(Schema::getColumns('patients'))->firstWhere('name', self::CODE_COLUMN);
        if (DB::connection()->getDriverName() !== 'sqlite'
            && ((int) ($categoryColumn['length'] ?? 0) < 100 || (int) ($codeColumn['length'] ?? 0) < 100)) {
            throw new RuntimeException('Patient numbering text columns are shorter than required. Manual schema review is required.');
        }

        $profileColumnType = strtolower((string) Schema::getColumnType('patients', self::PROFILE_COLUMN));
        if (! in_array($profileColumnType, ['bigint', 'integer'], true)) {
            throw new RuntimeException('The patients.patient_numbering_profile_id column has an incompatible type. Manual schema review is required.');
        }
    }

    private function assertProfileForeignKey(): void
    {
        $foreignKey = $this->profileForeignKey();
        if ($foreignKey !== null) {
            if ($foreignKey['foreign_table'] !== 'patient_numbering_profiles'
                || $foreignKey['foreign_columns'] !== ['id']
                || strtolower((string) $foreignKey['on_delete']) !== 'set null') {
                throw new RuntimeException('The patient numbering profile foreign key has an unexpected target or delete action. Manual review is required.');
            }

            return;
        }

        $orphanExists = DB::table('patients')
            ->whereNotNull(self::PROFILE_COLUMN)
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('patient_numbering_profiles')
                    ->whereColumn('patient_numbering_profiles.id', 'patients.'.self::PROFILE_COLUMN);
            })
            ->exists();
        if ($orphanExists) {
            throw new RuntimeException('Patient rows reference missing numbering profiles. Resolve orphaned references manually before adding the foreign key.');
        }

        Schema::table('patients', function (Blueprint $table): void {
            $table->foreign(self::PROFILE_COLUMN)
                ->references('id')
                ->on('patient_numbering_profiles')
                ->nullOnDelete();
        });
    }

    private function assertPatientCodeUniqueIndex(): void
    {
        $indexes = collect(Schema::getIndexes('patients'));
        $equivalentUniqueIndex = $indexes->first(
            fn (array $index): bool => $index['unique'] && $index['columns'] === [self::CODE_COLUMN]
        );
        if ($equivalentUniqueIndex !== null) {
            return;
        }

        $expectedName = 'patients_patient_code_unique';
        $nameCollision = $indexes->first(fn (array $index): bool => $index['name'] === $expectedName);
        if ($nameCollision !== null) {
            throw new RuntimeException('The expected patient-code unique-index name is already used by a different index. Manual review is required.');
        }

        $duplicateCode = DB::table('patients')
            ->select(self::CODE_COLUMN)
            ->whereNotNull(self::CODE_COLUMN)
            ->groupBy(self::CODE_COLUMN)
            ->havingRaw('COUNT(*) > 1')
            ->exists();
        if ($duplicateCode) {
            throw new RuntimeException('Duplicate non-null patient codes exist. Resolve the duplicates manually before enforcing uniqueness.');
        }

        Schema::table('patients', function (Blueprint $table) use ($expectedName): void {
            $table->unique(self::CODE_COLUMN, $expectedName);
        });
    }

    private function widenPatientSeriesWithoutChangingValues(): void
    {
        if (! Schema::hasColumn('patients', 'patient_series')) {
            throw new RuntimeException('The patients.patient_series column is missing; manual schema review is required.');
        }

        $length = $this->patientSeriesLength();
        if (($length === 0 && DB::connection()->getDriverName() !== 'sqlite') || $length > 50) {
            throw new RuntimeException('The patients.patient_series column has an unexpected length. Manual schema review is required.');
        }

        if ($length < 50) {
            Schema::table('patients', function (Blueprint $table): void {
                $table->string('patient_series', 50)->change();
            });
        }
    }

    private function assertNoNumberingDataWouldBeLost(): void
    {
        foreach ([self::PROFILE_COLUMN, self::CATEGORY_COLUMN, self::CODE_COLUMN] as $column) {
            if (Schema::hasColumn('patients', $column) && DB::table('patients')->whereNotNull($column)->exists()) {
                throw new RuntimeException('Patient numbering data exists; this migration cannot be rolled back without losing identifiers or assignments.');
            }
        }

        if (Schema::hasColumn('patients', 'patient_series')
            && DB::table('patients')->whereRaw('CHAR_LENGTH(patient_series) > 10')->exists()) {
            throw new RuntimeException('Patient series values exceed the legacy width; this migration cannot safely narrow the column.');
        }
    }

    /** @return array<string, mixed>|null */
    private function profileForeignKey(): ?array
    {
        return collect(Schema::getForeignKeys('patients'))
            ->first(fn (array $foreignKey): bool => $foreignKey['columns'] === [self::PROFILE_COLUMN]);
    }

    private function patientSeriesLength(): int
    {
        $column = collect(Schema::getColumns('patients'))->firstWhere('name', 'patient_series');
        $length = (int) ($column['length'] ?? 0);
        if ($length === 0 && DB::connection()->getDriverName() === 'sqlite') {
            return 50;
        }

        return $length;
    }
};
