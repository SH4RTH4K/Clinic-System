<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PROFILES = 'patient_numbering_profiles';

    private const SEQUENCES = 'patient_numbering_sequences';

    public function up(): void
    {
        $this->createMissingTables();
        $this->assertProfilesSchema();
        $this->assertSequencesSchema();
        $this->assertExistingProfilesAreUnambiguous();
        $this->seedGeneralProfileOnlyWhenSafe();
    }

    public function down(): void
    {
        if ((Schema::hasTable(self::PROFILES) && DB::table(self::PROFILES)->exists())
            || (Schema::hasTable(self::SEQUENCES) && DB::table(self::SEQUENCES)->exists())
            || (Schema::hasTable('patients')
                && Schema::hasColumn('patients', 'patient_numbering_profile_id')
                && DB::table('patients')->whereNotNull('patient_numbering_profile_id')->exists())) {
            throw new RuntimeException('Patient numbering profiles or sequence history exists; this migration cannot be rolled back safely.');
        }

        Schema::dropIfExists(self::SEQUENCES);
        Schema::dropIfExists(self::PROFILES);
    }

    private function createMissingTables(): void
    {
        if (! Schema::hasTable(self::PROFILES)) {
            Schema::create(self::PROFILES, function (Blueprint $table): void {
                $table->id();
                $table->string('name', 100);
                $table->string('category', 100);
                $table->string('category_code', 10)->nullable();
                $table->string('prefix', 10);
                $table->boolean('include_year')->default(false);
                $table->boolean('reset_annually')->default(false);
                $table->string('separator', 3)->default('-');
                $table->unsignedTinyInteger('number_padding')->default(4);
                $table->unsignedInteger('starting_number')->default(1);
                $table->boolean('is_active')->default(true);
                $table->boolean('is_default')->default(false);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable(self::SEQUENCES)) {
            Schema::create(self::SEQUENCES, function (Blueprint $table): void {
                $table->id();
                $table->unsignedBigInteger('patient_numbering_profile_id');
                $table->foreign('patient_numbering_profile_id', 'pn_seq_profile_fk')
                    ->references('id')
                    ->on(self::PROFILES)
                    ->cascadeOnDelete();
                $table->string('period_key', 20);
                $table->unsignedInteger('next_number');
                $table->timestamps();
                $table->unique(['patient_numbering_profile_id', 'period_key'], 'pn_seq_profile_period_unique');
            });
        }
    }

    private function assertProfilesSchema(): void
    {
        $expectedColumns = [
            'id', 'name', 'category', 'category_code', 'prefix', 'include_year', 'reset_annually', 'separator',
            'number_padding', 'starting_number', 'is_active', 'is_default', 'created_by', 'created_at', 'updated_at', 'deleted_at',
        ];

        if (! Schema::hasColumns(self::PROFILES, $expectedColumns)) {
            throw new RuntimeException('The existing patient_numbering_profiles table is incomplete or incompatible. Review it manually before retrying.');
        }

        $hasPrimaryKey = collect(Schema::getIndexes(self::PROFILES))->contains(
            fn (array $index): bool => $index['primary'] && $index['columns'] === ['id']
        );
        if (! $hasPrimaryKey) {
            throw new RuntimeException('The patient_numbering_profiles primary key is incompatible; no existing rows were changed.');
        }

        $createdByForeignKey = collect(Schema::getForeignKeys(self::PROFILES))
            ->first(fn (array $foreignKey): bool => $foreignKey['columns'] === ['created_by']);

        if ($createdByForeignKey === null
            || $createdByForeignKey['foreign_table'] !== 'users'
            || $createdByForeignKey['foreign_columns'] !== ['id']
            || strtolower((string) $createdByForeignKey['on_delete']) !== 'set null') {
            throw new RuntimeException('The patient_numbering_profiles.created_by foreign key is incompatible; manual review is required.');
        }
    }

    private function assertSequencesSchema(): void
    {
        if (! Schema::hasColumns(self::SEQUENCES, ['id', 'patient_numbering_profile_id', 'period_key', 'next_number', 'created_at', 'updated_at'])) {
            throw new RuntimeException('The existing patient_numbering_sequences table is incomplete or incompatible. Review it manually before retrying.');
        }

        $indexes = collect(Schema::getIndexes(self::SEQUENCES));
        $hasPrimaryKey = $indexes->contains(fn (array $index): bool => $index['primary'] && $index['columns'] === ['id']);
        $hasUniqueProfilePeriod = $indexes->contains(
            fn (array $index): bool => $index['unique'] && $index['columns'] === ['patient_numbering_profile_id', 'period_key']
        );
        if (! $hasPrimaryKey || ! $hasUniqueProfilePeriod) {
            throw new RuntimeException('The patient_numbering_sequences primary or unique index is incompatible; manual review is required.');
        }

        $profileForeignKey = collect(Schema::getForeignKeys(self::SEQUENCES))
            ->first(fn (array $foreignKey): bool => $foreignKey['columns'] === ['patient_numbering_profile_id']);
        if ($profileForeignKey === null
            || $profileForeignKey['foreign_table'] !== self::PROFILES
            || $profileForeignKey['foreign_columns'] !== ['id']
            || strtolower((string) $profileForeignKey['on_delete']) !== 'cascade') {
            throw new RuntimeException('The patient_numbering_sequences profile foreign key is incompatible; manual review is required.');
        }

        $hasOrphans = DB::table(self::SEQUENCES)
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from(self::PROFILES)
                    ->whereColumn(self::PROFILES.'.id', self::SEQUENCES.'.patient_numbering_profile_id');
            })
            ->exists();
        if ($hasOrphans) {
            throw new RuntimeException('Orphaned patient numbering sequence rows exist; resolve them manually without deleting or merging records.');
        }
    }

    private function assertExistingProfilesAreUnambiguous(): void
    {
        if (DB::table(self::PROFILES)->where('is_default', true)->count() > 1) {
            throw new RuntimeException('Multiple default patient numbering profiles exist. Resolve the default selection manually; no profile was changed.');
        }

        $generalProfiles = DB::table(self::PROFILES)
            ->where('name', 'General')
            ->where('category', 'General')
            ->count();
        if ($generalProfiles > 1) {
            throw new RuntimeException('Multiple General patient numbering profiles exist. Resolve them manually; no profile was merged or deleted.');
        }

        if (! Schema::hasColumn('patients', 'patient_numbering_profile_id')) {
            return;
        }

        $profilesWithoutAssignments = DB::table(self::PROFILES.' as profiles')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('patients')
                    ->whereColumn('patients.patient_numbering_profile_id', 'profiles.id');
            })
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from(self::SEQUENCES)
                    ->whereColumn(self::SEQUENCES.'.patient_numbering_profile_id', 'profiles.id');
            })
            ->get(['profiles.id', 'profiles.starting_number']);

        $profilesWithAssignmentsAndNoSequence = DB::table(self::PROFILES.' as profiles')
            ->whereExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('patients')
                    ->whereColumn('patients.patient_numbering_profile_id', 'profiles.id');
            })
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from(self::SEQUENCES)
                    ->whereColumn(self::SEQUENCES.'.patient_numbering_profile_id', 'profiles.id');
            })
            ->exists();

        if ($profilesWithAssignmentsAndNoSequence) {
            throw new RuntimeException('A profile with registered patients has no sequence history. Its next value cannot be verified; manual reconciliation is required.');
        }

        if ($profilesWithoutAssignments->contains(fn (object $profile): bool => (int) $profile->starting_number < 1)) {
            throw new RuntimeException('An unused patient numbering profile has an invalid starting number; manual review is required.');
        }
    }

    private function seedGeneralProfileOnlyWhenSafe(): void
    {
        DB::transaction(function (): void {
            $generalProfile = DB::table(self::PROFILES)
                ->where('name', 'General')
                ->where('category', 'General')
                ->first();

            if ($generalProfile !== null) {
                if (! $generalProfile->is_default && DB::table(self::PROFILES)->where('is_default', true)->doesntExist()) {
                    throw new RuntimeException('A General profile exists but is not the default and no default profile is configured. Select the default manually.');
                }

                if ($generalProfile->is_default) {
                    $this->ensureDefaultSequenceCanBeVerified($generalProfile);
                }

                return;
            }

            if (DB::table(self::PROFILES)->where('is_default', true)->exists()) {
                return;
            }

            if (DB::table(self::PROFILES)->exists() || DB::table(self::SEQUENCES)->exists()) {
                throw new RuntimeException('Existing numbering profiles or sequences have no unambiguous General default. Review them manually; no profile or sequence was added.');
            }

            [$prefix, $nextNumber] = $this->verifiedLegacyNumberingStart();
            $now = now();
            $profileId = DB::table(self::PROFILES)->insertGetId([
                'name' => 'General',
                'category' => 'General',
                'category_code' => null,
                'prefix' => $prefix,
                'include_year' => false,
                'reset_annually' => false,
                'separator' => '-',
                'number_padding' => 0,
                'starting_number' => $nextNumber,
                'is_active' => true,
                'is_default' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table(self::SEQUENCES)->insert([
                'patient_numbering_profile_id' => $profileId,
                'period_key' => 'all',
                'next_number' => $nextNumber,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });
    }

    private function ensureDefaultSequenceCanBeVerified(object $profile): void
    {
        if (DB::table(self::SEQUENCES)
            ->where('patient_numbering_profile_id', $profile->id)
            ->where('period_key', 'all')
            ->exists()) {
            return;
        }

        $hasAssignments = Schema::hasColumn('patients', 'patient_numbering_profile_id')
            && DB::table('patients')->where('patient_numbering_profile_id', $profile->id)->exists();
        if ($hasAssignments) {
            throw new RuntimeException('The General profile has patient assignments but no sequence row. Its next value cannot be verified; manual reconciliation is required.');
        }

        $legacyPatientsExist = DB::table('patients')->where('patient_series', $profile->prefix)->exists();
        if ($legacyPatientsExist) {
            [$prefix, $nextNumber] = $this->verifiedLegacyNumberingStart();
            if ($prefix !== $profile->prefix) {
                throw new RuntimeException('The legacy clinic prefix differs from the existing General profile. Manual numbering reconciliation is required.');
            }
        } else {
            $nextNumber = (int) $profile->starting_number;
            if ($nextNumber < 1) {
                throw new RuntimeException('The existing General profile has no verifiable positive starting number. Manual review is required.');
            }
        }

        DB::table(self::SEQUENCES)->insert([
            'patient_numbering_profile_id' => $profile->id,
            'period_key' => 'all',
            'next_number' => $nextNumber,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @return array{string, int} */
    private function verifiedLegacyNumberingStart(): array
    {
        $settings = DB::table('clinic_settings')->orderBy('id')->first();
        $hasPatients = DB::table('patients')->exists();

        if ($settings === null) {
            if ($hasPatients) {
                throw new RuntimeException('Clinic numbering settings are missing while patients exist. The next patient number cannot be verified.');
            }

            return ['A', 1];
        }

        $prefix = (string) ($settings->patient_no_series ?? '');
        $nextNumber = (int) ($settings->patient_no_next ?? 0);
        if ($prefix === '' || $nextNumber < 1) {
            throw new RuntimeException('Clinic numbering settings do not contain a verifiable prefix and positive next number.');
        }

        $highestExistingNumber = DB::table('patients')
            ->where('patient_series', $prefix)
            ->max('patient_no');
        if ($highestExistingNumber !== null && (int) $highestExistingNumber >= $nextNumber) {
            throw new RuntimeException('The clinic next number is not greater than existing patient numbers for the configured prefix. Manual reconciliation is required.');
        }

        return [$prefix, $nextNumber];
    }
};
