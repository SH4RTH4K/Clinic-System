<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Visit;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class LegacyMigrationRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_numbering_migrations_can_be_repeated_without_changing_existing_patient_or_sequence_values(): void
    {
        $profileId = DB::table('patient_numbering_profiles')->where('is_default', true)->value('id');
        $sequenceBefore = DB::table('patient_numbering_sequences')
            ->where('patient_numbering_profile_id', $profileId)
            ->where('period_key', 'all')
            ->value('next_number');
        $patient = Patient::factory()->create([
            'patient_no' => 84,
            'patient_series' => 'T',
            'patient_code' => 'T-0084',
            'patient_category' => 'Existing',
            'patient_numbering_profile_id' => $profileId,
        ]);

        $this->runMigration('2026_11_03_160208_create_patient_numbering_profiles_table.php');
        $this->runMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');

        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'patient_no' => 84,
            'patient_series' => 'T',
            'patient_code' => 'T-0084',
            'patient_category' => 'Existing',
            'patient_numbering_profile_id' => $profileId,
        ]);
        $this->assertSame($sequenceBefore, DB::table('patient_numbering_sequences')
            ->where('patient_numbering_profile_id', $profileId)
            ->where('period_key', 'all')
            ->value('next_number'));
        $this->assertSame(1, DB::table('patient_numbering_profiles')->where('is_default', true)->count());
    }

    public function test_missing_sequence_table_is_recreated_without_changing_profile_identity_or_start(): void
    {
        $profile = DB::table('patient_numbering_profiles')->where('is_default', true)->first();
        Schema::drop('patient_numbering_sequences');

        $this->runMigration('2026_11_03_160208_create_patient_numbering_profiles_table.php');

        $this->assertDatabaseHas('patient_numbering_profiles', ['id' => $profile->id, 'starting_number' => $profile->starting_number]);
        $this->assertDatabaseHas('patient_numbering_sequences', [
            'patient_numbering_profile_id' => $profile->id,
            'period_key' => 'all',
            'next_number' => $profile->starting_number,
        ]);
    }

    public function test_incompatible_partial_numbering_table_is_preserved_and_rejected(): void
    {
        Schema::drop('patient_numbering_sequences');
        Schema::create('patient_numbering_sequences', function (Blueprint $table): void {
            $table->id();
        });

        try {
            $this->runMigration('2026_11_03_160208_create_patient_numbering_profiles_table.php');
            $this->fail('Expected incompatible partial schema to stop for manual review.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('incomplete or incompatible', $exception->getMessage());
        }

        $this->assertTrue(Schema::hasColumn('patient_numbering_sequences', 'id'));
        $this->assertFalse(Schema::hasColumn('patient_numbering_sequences', 'next_number'));
    }

    public function test_numbering_migration_stops_when_default_profile_has_patient_assignments_but_no_sequence(): void
    {
        $profileId = DB::table('patient_numbering_profiles')->where('is_default', true)->value('id');
        DB::table('patient_numbering_sequences')
            ->where('patient_numbering_profile_id', $profileId)
            ->delete();
        Patient::factory()->create(['patient_numbering_profile_id' => $profileId]);

        try {
            $this->runMigration('2026_11_03_160208_create_patient_numbering_profiles_table.php');
            $this->fail('Expected ambiguous sequence history to stop for manual review.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('no sequence history', $exception->getMessage());
        }

        $this->assertSame(0, DB::table('patient_numbering_sequences')
            ->where('patient_numbering_profile_id', $profileId)->count());
    }

    public function test_numbering_migration_rejects_multiple_default_profiles_without_merging_them(): void
    {
        $profile = DB::table('patient_numbering_profiles')->where('is_default', true)->first();
        $duplicateId = DB::table('patient_numbering_profiles')->insertGetId([
            'name' => 'Second Default',
            'category' => 'Second',
            'prefix' => 'S',
            'number_padding' => 4,
            'starting_number' => 1,
            'is_active' => true,
            'is_default' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('patient_numbering_sequences')->insert([
            'patient_numbering_profile_id' => $duplicateId,
            'period_key' => 'all',
            'next_number' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $this->runMigration('2026_11_03_160208_create_patient_numbering_profiles_table.php');
            $this->fail('Expected duplicate defaults to stop for manual review.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Multiple default', $exception->getMessage());
        }

        $this->assertDatabaseHas('patient_numbering_profiles', ['id' => $profile->id]);
        $this->assertDatabaseHas('patient_numbering_profiles', ['id' => $duplicateId]);
    }

    public function test_numbering_fields_migration_preserves_existing_foreign_key_and_rejects_duplicate_codes(): void
    {
        $foreignKey = collect(Schema::getForeignKeys('patients'))
            ->first(fn (array $key): bool => $key['columns'] === ['patient_numbering_profile_id']);
        $this->assertNotNull($foreignKey);
        $this->assertSame('set null', strtolower($foreignKey['on_delete']));

        Schema::table('patients', function (Blueprint $table): void {
            $table->dropUnique('patients_patient_code_unique');
        });

        Patient::factory()->create(['patient_code' => 'DUPLICATE-CODE']);
        Patient::factory()->create(['patient_code' => 'DUPLICATE-CODE']);

        try {
            $this->runMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');
            $this->fail('Expected duplicate patient codes to prevent uniqueness changes.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('Duplicate non-null patient codes', $exception->getMessage());
        }

        $this->assertSame(2, DB::table('patients')->where('patient_code', 'DUPLICATE-CODE')->count());
        $this->assertSame(1, DB::table('patients')->where('patient_code', 'DUPLICATE-CODE')->distinct()->count('patient_code'));
    }

    public function test_numbering_fields_migration_accepts_verified_varchar_100_columns_and_preserves_values(): void
    {
        $this->withNumberingMigrationProbe(function (): void {
            $this->createNumberingMigrationProbeSchema('varchar(100)', 'varchar(100)');
            DB::table('patient_numbering_profiles')->insert(['id' => 1]);
            DB::table('patients')->insert([
                'id' => 77,
                'patient_no' => 777,
                'patient_series' => 'SYN',
                'patient_numbering_profile_id' => 1,
                'patient_category' => 'Synthetic category',
                'patient_code' => 'SYN-0777',
            ]);

            $this->runMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');

            $this->assertDatabaseHas('patients', [
                'id' => 77,
                'patient_no' => 777,
                'patient_series' => 'SYN',
                'patient_numbering_profile_id' => 1,
                'patient_category' => 'Synthetic category',
                'patient_code' => 'SYN-0777',
            ]);
            $this->assertContains(strtolower(Schema::getColumnType('patients', 'patient_series')), ['string', 'varchar']);
        });
    }

    public function test_numbering_fields_migration_rejects_undersized_column_without_changing_values(): void
    {
        $this->withNumberingMigrationProbe(function (): void {
            $this->createNumberingMigrationProbeSchema('varchar(50)', 'varchar(100)');
            DB::table('patients')->insert([
                'id' => 78,
                'patient_no' => 778,
                'patient_series' => 'T',
                'patient_category' => 'Existing category',
                'patient_code' => 'SYN-0778',
            ]);

            try {
                $this->runMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');
                $this->fail('Expected an undersized column definition to stop migration recovery.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('must support at least 100 characters', $exception->getMessage());
            }

            $this->assertDatabaseHas('patients', [
                'id' => 78,
                'patient_category' => 'Existing category',
                'patient_code' => 'SYN-0778',
            ]);
            $this->assertCount(0, Schema::getForeignKeys('patients'));
            $this->assertCount(0, collect(Schema::getIndexes('patients'))->filter(
                fn (array $index): bool => $index['unique'] && $index['columns'] === ['patient_code']
            ));
        });
    }

    public function test_numbering_fields_migration_rejects_unexpected_column_type(): void
    {
        $this->withNumberingMigrationProbe(function (): void {
            $this->createNumberingMigrationProbeSchema('varchar(100)', 'text');
            DB::table('patients')->insert([
                'id' => 79,
                'patient_no' => 779,
                'patient_series' => 'T',
                'patient_category' => 'Existing category',
                'patient_code' => 'SYN-0779',
            ]);

            try {
                $this->runMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');
                $this->fail('Expected an unexpected column type to stop migration recovery.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('patient_code column must be VARCHAR', $exception->getMessage());
            }

            $this->assertDatabaseHas('patients', ['id' => 79, 'patient_code' => 'SYN-0779']);
        });
    }

    public function test_numbering_fields_migration_resumes_partial_schema_and_adds_missing_index_and_foreign_key(): void
    {
        $this->withNumberingMigrationProbe(function (): void {
            $this->createNumberingMigrationProbeSchema('varchar(100)', 'varchar(100)');
            DB::table('patient_numbering_profiles')->insert(['id' => 1]);
            DB::table('patients')->insert([
                'id' => 80,
                'patient_no' => 780,
                'patient_series' => 'T',
                'patient_numbering_profile_id' => 1,
                'patient_category' => 'Partial schema',
                'patient_code' => 'SYN-0780',
            ]);

            $this->runMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');

            $this->assertDatabaseHas('patients', [
                'id' => 80,
                'patient_numbering_profile_id' => 1,
                'patient_category' => 'Partial schema',
                'patient_code' => 'SYN-0780',
            ]);
            $this->assertTrue(collect(Schema::getIndexes('patients'))->contains(
                fn (array $index): bool => $index['unique'] && $index['columns'] === ['patient_code']
            ));
            $this->assertTrue(collect(Schema::getForeignKeys('patients'))->contains(
                fn (array $foreignKey): bool => $foreignKey['columns'] === ['patient_numbering_profile_id']
                    && $foreignKey['foreign_table'] === 'patient_numbering_profiles'
                    && strtolower($foreignKey['on_delete']) === 'set null'
            ));
        });
    }

    public function test_numbering_fields_migration_rejects_orphaned_profile_without_repairing_it(): void
    {
        $this->withNumberingMigrationProbe(function (): void {
            $this->createNumberingMigrationProbeSchema('varchar(100)', 'varchar(100)');
            DB::table('patients')->insert([
                'id' => 81,
                'patient_no' => 781,
                'patient_series' => 'T',
                'patient_numbering_profile_id' => 987,
                'patient_category' => 'Orphan retained',
                'patient_code' => 'SYN-0781',
            ]);

            try {
                $this->runMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');
                $this->fail('Expected orphaned profile reference to stop migration recovery.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('reference missing numbering profiles', $exception->getMessage());
            }

            $this->assertDatabaseHas('patients', [
                'id' => 81,
                'patient_numbering_profile_id' => 987,
                'patient_category' => 'Orphan retained',
                'patient_code' => 'SYN-0781',
            ]);
            $this->assertSame(0, DB::table('patient_numbering_profiles')->count());
        });
    }

    public function test_numbering_fields_migration_repairs_one_missing_nullable_column_without_rewriting_other_values(): void
    {
        $patient = Patient::factory()->create([
            'patient_code' => 'PRESERVE-CODE',
            'patient_category' => 'Preserve category',
        ]);
        Schema::table('patients', function (Blueprint $table): void {
            $table->dropColumn('patient_category');
        });

        $this->runMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');

        $this->assertTrue(Schema::hasColumn('patients', 'patient_category'));
        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'patient_code' => 'PRESERVE-CODE',
            'patient_numbering_profile_id' => $patient->patient_numbering_profile_id,
        ]);
    }

    public function test_numbering_migration_refuses_rollback_after_profiles_or_patient_identifiers_exist(): void
    {
        $patient = Patient::factory()->create(['patient_code' => 'KEEP-THIS-CODE']);
        $migration = $this->loadMigration('2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php');

        try {
            $migration->down();
            $this->fail('Expected populated patient numbering data to prevent rollback.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('cannot be rolled back', $exception->getMessage());
        }

        $this->assertDatabaseHas('patients', ['id' => $patient->id, 'patient_code' => 'KEEP-THIS-CODE']);

        $profilesMigration = $this->loadMigration('2026_11_03_160208_create_patient_numbering_profiles_table.php');
        try {
            $profilesMigration->down();
            $this->fail('Expected profile history to prevent rollback.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('cannot be rolled back safely', $exception->getMessage());
        }
    }

    public function test_doctor_profile_migration_never_creates_doctor_from_clinic_settings(): void
    {
        $this->createClinicSetting(['doctor_name' => 'Dr. Fictional', 'hero_title_1' => 'Clinic hero']);
        DB::table('doctors')->delete();

        try {
            $this->runMigration('2026_09_27_194856_move_hero_and_social_fields_to_doctors_table.php');
            $this->fail('Expected identity-dependent transfer to stop without an identified Doctor.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('one unambiguous matching Doctor', $exception->getMessage());
        }

        $this->assertSame(0, Doctor::query()->count());
    }

    public function test_doctor_profile_transfer_fills_only_blank_fields_on_matching_existing_doctor(): void
    {
        $this->createClinicSetting([
            'doctor_name' => 'Dr. Fictional',
            'doctor_credentials' => 'DHMS',
            'hero_title_1' => 'Transferred title',
            'social_facebook' => 'https://example.invalid/page',
        ]);
        $doctorId = DB::table('doctors')->insertGetId([
            'name' => 'Dr. Fictional',
            'credentials' => 'Original credentials',
            'hero_title_1' => 'Existing title',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->runMigration('2026_09_27_194856_move_hero_and_social_fields_to_doctors_table.php');

        $this->assertDatabaseHas('doctors', [
            'id' => $doctorId,
            'credentials' => 'Original credentials',
            'hero_title_1' => 'Existing title',
            'social_facebook' => 'https://example.invalid/page',
        ]);
        $this->assertSame(1, Doctor::query()->count());
    }

    public function test_doctor_profile_migration_refuses_ambiguous_identity_and_does_not_reassign_visits(): void
    {
        $this->createClinicSetting(['doctor_name' => 'Different Name', 'hero_title_1' => 'Transfer candidate']);
        $doctorId = DB::table('doctors')->insertGetId([
            'name' => 'Existing Doctor',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $this->runMigration('2026_09_27_194856_move_hero_and_social_fields_to_doctors_table.php');
            $this->fail('Expected identity mismatch to stop transfer.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('does not match', $exception->getMessage());
        }

        $this->assertDatabaseHas('doctors', ['id' => $doctorId, 'name' => 'Existing Doctor']);
    }

    public function test_doctor_migration_recreates_a_missing_field_and_preserves_visit_attribution(): void
    {
        $this->createClinicSetting();
        $doctorId = DB::table('doctors')->insertGetId([
            'name' => 'Dr. Synthetic',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $visit = Visit::factory()->create(['doctor_id' => $doctorId]);
        Schema::table('doctors', function (Blueprint $table): void {
            $table->dropColumn('social_twitter');
        });

        $this->runMigration('2026_09_27_194856_move_hero_and_social_fields_to_doctors_table.php');

        $this->assertTrue(Schema::hasColumn('doctors', 'social_twitter'));
        $this->assertDatabaseHas('visits', ['id' => $visit->id, 'doctor_id' => $doctorId]);
    }

    public function test_forward_only_recovery_migration_is_repeatable_and_refuses_rollback(): void
    {
        $recovery = $this->loadMigration('2026_11_04_120000_verify_legacy_numbering_and_doctor_migration_recovery.php');
        $recovery->up();
        $recovery->up();

        $this->assertSame(1, DB::table('patient_numbering_profiles')->where('is_default', true)->count());
        $this->assertSame(1, DB::table('patient_numbering_sequences')->where('period_key', 'all')->count());

        try {
            $recovery->down();
            $this->fail('Expected forward-only correction to refuse rollback.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('cannot be rolled back safely', $exception->getMessage());
        }
    }

    private function runMigration(string $file): void
    {
        $this->loadMigration($file)->up();
    }

    private function loadMigration(string $file): Migration
    {
        return require database_path('migrations/'.$file);
    }

    private function withNumberingMigrationProbe(callable $callback): void
    {
        $defaultConnection = config('database.default');
        config([
            'database.connections.numbering_migration_probe' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
            'database.default' => 'numbering_migration_probe',
        ]);
        DB::purge('numbering_migration_probe');

        try {
            $callback();
        } finally {
            DB::disconnect('numbering_migration_probe');
            DB::purge('numbering_migration_probe');
            config(['database.default' => $defaultConnection]);
        }
    }

    private function createNumberingMigrationProbeSchema(string $categoryType, string $codeType): void
    {
        Schema::create('patient_numbering_profiles', function (Blueprint $table): void {
            $table->id();
        });
        DB::statement("CREATE TABLE patients (id INTEGER PRIMARY KEY, patient_no INTEGER NOT NULL, patient_series VARCHAR(10) NOT NULL, patient_numbering_profile_id INTEGER NULL, patient_category {$categoryType} NULL, patient_code {$codeType} NULL)");
    }

    /** @param array<string, mixed> $overrides */
    private function createClinicSetting(array $overrides = []): void
    {
        ClinicSetting::query()->create(array_merge([
            'clinic_name_en' => 'Synthetic Clinic',
            'doctor_name' => 'Dr. Synthetic',
            'doctor_credentials' => 'DHMS',
            'address' => 'Fictional Road',
            'phone' => '01000000000',
        ], $overrides));
    }
}
