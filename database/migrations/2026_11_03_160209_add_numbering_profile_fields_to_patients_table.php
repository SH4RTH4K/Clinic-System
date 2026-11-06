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

        $patientSeriesLength = $this->patientSeriesLength();
        if ($patientSeriesLength !== null && $patientSeriesLength > 10) {
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

        foreach ([self::CATEGORY_COLUMN, self::CODE_COLUMN] as $columnName) {
            $this->assertVarcharColumnLength($columnName, 100);
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
        if ($length !== null && $length > 50) {
            throw new RuntimeException('The patients.patient_series column has an unexpected length. Manual schema review is required.');
        }

        if ($length !== null && $length < 50) {
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

    private function patientSeriesLength(): ?int
    {
        $definition = $this->characterColumnDefinition('patient_series');
        if (! in_array($definition['type'], ['varchar', 'character varying'], true)) {
            throw new RuntimeException('The patients.patient_series column must be VARCHAR; manual schema review is required.');
        }

        if ($definition['length'] === null && ! $this->isUnboundedSqliteVarchar($definition['type'])) {
            throw new RuntimeException('The patients.patient_series column length could not be verified; manual schema review is required.');
        }

        return $definition['length'];
    }

    private function assertVarcharColumnLength(string $columnName, int $minimumLength): void
    {
        $definition = $this->characterColumnDefinition($columnName);
        if (! in_array($definition['type'], ['varchar', 'character varying'], true)) {
            throw new RuntimeException("The patients.{$columnName} column must be VARCHAR; manual schema review is required.");
        }

        if ($definition['length'] === null && ! $this->isUnboundedSqliteVarchar($definition['type'])) {
            throw new RuntimeException("The patients.{$columnName} column length could not be verified; manual schema review is required.");
        }

        if ($definition['length'] !== null && $definition['length'] < $minimumLength) {
            throw new RuntimeException("The patients.{$columnName} column must support at least {$minimumLength} characters; manual schema review is required.");
        }
    }

    private function isUnboundedSqliteVarchar(string $type): bool
    {
        return DB::connection()->getDriverName() === 'sqlite'
            && in_array($type, ['varchar', 'character varying'], true);
    }

    /** @return array{type: string, length: int|null} */
    private function characterColumnDefinition(string $columnName): array
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            $column = DB::selectOne(
                'SELECT DATA_TYPE AS data_type, CHARACTER_MAXIMUM_LENGTH AS character_length FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
                ['patients', $columnName],
            );

            if ($column === null) {
                throw new RuntimeException("The patients.{$columnName} column metadata is unavailable; manual schema review is required.");
            }

            return [
                'type' => strtolower((string) $column->data_type),
                'length' => $column->character_length === null ? null : (int) $column->character_length,
            ];
        }

        if ($driver === 'sqlite') {
            $column = collect(DB::select('PRAGMA table_info(patients)'))
                ->first(fn (object $column): bool => $column->name === $columnName);

            if ($column === null) {
                throw new RuntimeException("The patients.{$columnName} column metadata is unavailable; manual schema review is required.");
            }

            $declaredType = strtolower(trim((string) $column->type));
            if (in_array($declaredType, ['varchar', 'character varying'], true)) {
                return [
                    'type' => $declaredType,
                    'length' => null,
                ];
            }

            if (preg_match('/^(varchar|character varying)\s*\(\s*(\d+)\s*\)$/', $declaredType, $matches) === 1) {
                return [
                    'type' => $matches[1],
                    'length' => (int) $matches[2],
                ];
            }

            return [
                'type' => $declaredType,
                'length' => null,
            ];
        }

        throw new RuntimeException("Column definition verification is unsupported for the {$driver} database driver.");
    }
};
