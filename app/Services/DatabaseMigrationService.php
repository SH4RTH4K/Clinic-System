<?php

namespace App\Services;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Throwable;

class DatabaseMigrationService
{
    /**
     * Return comprehensive database diagnostics, migration status, and key table stats.
     *
     * @return array<string, mixed>
     */
    public function status(): array
    {
        $connected = false;
        $driver = (string) config('database.default', 'mysql');
        $database = '';
        $version = 'Unavailable';

        try {
            $pdo = DB::connection()->getPdo();
            $connected = true;
            $driver = DB::connection()->getDriverName();
            $database = (string) DB::connection()->getDatabaseName();
            $version = (string) $pdo->getAttribute(\PDO::ATTR_SERVER_VERSION);
        } catch (Throwable $exception) {
            Log::warning('Database connection check failed during migration status inquiry.', [
                'error' => $exception->getMessage(),
            ]);
        }

        $ranMigrations = [];
        $latestBatch = 0;

        if ($connected && Schema::hasTable('migrations')) {
            try {
                $records = DB::table('migrations')
                    ->orderBy('batch')
                    ->orderBy('migration')
                    ->get();

                foreach ($records as $record) {
                    $ranMigrations[$record->migration] = (int) $record->batch;
                    if ((int) $record->batch > $latestBatch) {
                        $latestBatch = (int) $record->batch;
                    }
                }
            } catch (Throwable $exception) {
                Log::warning('Could not query migrations table.', ['error' => $exception->getMessage()]);
            }
        }

        $migrationFiles = File::glob(database_path('migrations/*.php')) ?: [];
        sort($migrationFiles);

        $migrations = [];
        $ranCount = 0;
        $pendingCount = 0;

        foreach ($migrationFiles as $filePath) {
            $filename = basename($filePath);
            $name = preg_replace('/\.php$/', '', $filename);
            $ran = isset($ranMigrations[$name]);
            $batch = $ran ? $ranMigrations[$name] : null;

            if ($ran) {
                $ranCount++;
            } else {
                $pendingCount++;
            }

            $migrations[] = [
                'name' => $name,
                'filename' => $filename,
                'ran' => $ran,
                'batch' => $batch,
            ];
        }

        $keyTables = [
            'patients' => 'Patients',
            'visits' => 'Visits',
            'prescriptions' => 'Prescriptions',
            'prescription_items' => 'Prescription Items',
            'medicines' => 'Medicines',
            'symptoms' => 'Symptoms',
            'users' => 'Users',
            'clinic_settings' => 'Clinic Settings',
            'patient_numbering_profiles' => 'Numbering Profiles',
            'activity_log' => 'Activity Logs',
        ];

        $tableStats = [];
        foreach ($keyTables as $table => $label) {
            if ($connected && Schema::hasTable($table)) {
                try {
                    $tableStats[] = [
                        'table' => $table,
                        'label' => $label,
                        'exists' => true,
                        'rows' => DB::table($table)->count(),
                    ];
                } catch (Throwable) {
                    $tableStats[] = ['table' => $table, 'label' => $label, 'exists' => true, 'rows' => 0];
                }
            } else {
                $tableStats[] = ['table' => $table, 'label' => $label, 'exists' => false, 'rows' => 0];
            }
        }

        return [
            'connected' => $connected,
            'driver' => $driver,
            'database' => $database,
            'version' => $version,
            'migrations' => array_reverse($migrations),
            'total_count' => count($migrations),
            'ran_count' => $ranCount,
            'pending_count' => $pendingCount,
            'latest_batch' => $latestBatch,
            'tables' => $tableStats,
        ];
    }

    /**
     * Run all pending database migrations.
     *
     * @return array{success: bool, output: string}
     */
    public function migrate(): array
    {
        try {
            $exitCode = Artisan::call('migrate', ['--force' => true]);
            $output = trim(Artisan::output());

            return [
                'success' => $exitCode === 0,
                'output' => $output !== '' ? $output : 'Migrations executed successfully with no output.',
            ];
        } catch (Throwable $exception) {
            Log::error('In-app database migration failed.', ['error' => $exception->getMessage()]);

            return [
                'success' => false,
                'output' => $exception->getMessage(),
            ];
        }
    }

    /**
     * Rollback the most recent migration batch or step.
     *
     * @return array{success: bool, output: string}
     */
    public function rollback(int $step = 1): array
    {
        try {
            $exitCode = Artisan::call('migrate:rollback', [
                '--force' => true,
                '--step' => max(1, $step),
            ]);
            $output = trim(Artisan::output());

            return [
                'success' => $exitCode === 0,
                'output' => $output !== '' ? $output : 'Rollback executed with no output.',
            ];
        } catch (Throwable $exception) {
            Log::error('In-app database rollback failed.', ['error' => $exception->getMessage()]);

            return [
                'success' => false,
                'output' => $exception->getMessage(),
            ];
        }
    }

    /**
     * Rollback the last migration batch and re-run migrations.
     *
     * @return array{success: bool, output: string}
     */
    public function remigrate(int $step = 1): array
    {
        try {
            $rollbackCode = Artisan::call('migrate:rollback', [
                '--force' => true,
                '--step' => max(1, $step),
            ]);
            $rollbackOutput = trim(Artisan::output());

            if ($rollbackCode !== 0) {
                return [
                    'success' => false,
                    'output' => "Rollback step failed:\n".$rollbackOutput,
                ];
            }

            $migrateCode = Artisan::call('migrate', ['--force' => true]);
            $migrateOutput = trim(Artisan::output());

            $output = "Rollback output:\n".($rollbackOutput ?: 'Done')."\n\nMigrate output:\n".($migrateOutput ?: 'Done');

            return [
                'success' => $migrateCode === 0,
                'output' => $output,
            ];
        } catch (Throwable $exception) {
            Log::error('In-app database re-migration failed.', ['error' => $exception->getMessage()]);

            return [
                'success' => false,
                'output' => $exception->getMessage(),
            ];
        }
    }

    /**
     * Clear application, configuration, route, and view caches.
     *
     * @return array{success: bool, output: string}
     */
    public function clearCaches(): array
    {
        try {
            $exitCode = Artisan::call('optimize:clear');
            $output = trim(Artisan::output());

            return [
                'success' => $exitCode === 0,
                'output' => $output !== '' ? $output : 'Compiled application caches cleared.',
            ];
        } catch (Throwable $exception) {
            Log::error('Cache clearing failed.', ['error' => $exception->getMessage()]);

            return [
                'success' => false,
                'output' => $exception->getMessage(),
            ];
        }
    }

    /**
     * Rebuild configuration, route, and view caches.
     *
     * @return array{success: bool, output: string}
     */
    public function rebuildCaches(): array
    {
        if (app()->environment('testing')) {
            return [
                'success' => true,
                'output' => 'Testing environment cache rebuild skipped.',
            ];
        }

        $outputs = [];
        $success = true;

        foreach (['config:cache', 'route:cache', 'view:cache'] as $command) {
            try {
                $code = Artisan::call($command);
                $out = trim(Artisan::output());
                $outputs[] = "{$command}: ".($out !== '' ? $out : 'Done');
                if ($code !== 0) {
                    $success = false;
                }
            } catch (Throwable $exception) {
                $success = false;
                $outputs[] = "{$command} failed: ".$exception->getMessage();
            }
        }

        return [
            'success' => $success,
            'output' => implode("\n", $outputs),
        ];
    }
}
