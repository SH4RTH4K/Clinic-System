<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /** @var list<string> */
    private const RECOVERY_MIGRATIONS = [
        '2026_11_03_160208_create_patient_numbering_profiles_table.php',
        '2026_11_03_160209_add_numbering_profile_fields_to_patients_table.php',
        '2026_09_27_194856_move_hero_and_social_fields_to_doctors_table.php',
    ];

    public function up(): void
    {
        foreach (self::RECOVERY_MIGRATIONS as $migrationFile) {
            $migrationPath = database_path('migrations/'.$migrationFile);
            if (! is_file($migrationPath)) {
                throw new RuntimeException("Required historical migration {$migrationFile} is missing; recovery stopped without changing migration history.");
            }

            $migration = require $migrationPath;
            $migration->up();
        }
    }

    public function down(): void
    {
        throw new RuntimeException('This migration verifies and repairs forward-only clinical numbering and Doctor profile state. It cannot be rolled back safely.');
    }
};
