<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

#[Signature('clinic:import-sql {file : Path to the SQL file to import} {--fresh : Drop all existing tables before import} {--force : Force import without confirmation}')]
#[Description('Import a UTF-8 SQL dump into the current database with foreign key safety')]
class ClinicImportSqlDatabaseCommand extends Command
{
    public function handle(DatabaseBackupService $backupService): int
    {
        $filePath = (string) $this->argument('file');

        if (! file_exists($filePath)) {
            $this->error("The specified SQL file does not exist: {$filePath}");

            return self::FAILURE;
        }

        $databaseName = (string) config('database.connections.mysql.database');

        if (! $this->option('force') && ! $this->confirm("Are you sure you want to import [{$filePath}] into [{$databaseName}]? This will replace or update existing records.")) {
            $this->info('Import cancelled.');

            return self::SUCCESS;
        }

        $connection = DB::connection();
        if ($connection->getDriverName() !== 'mysql') {
            $this->error('Direct SQL import is only supported for MySQL / MariaDB.');

            return self::FAILURE;
        }

        $this->info('Creating automatic safety backup before import...');
        try {
            $safetyBackup = $backupService->create('database');
            $this->info('Safety backup created: '.basename($safetyBackup));
        } catch (Throwable $e) {
            $this->warn('Could not create pre-import safety backup: '.$e->getMessage());
        }

        if ($this->option('fresh')) {
            $this->info("Dropping all existing tables in [{$databaseName}]...");
            $connection->unprepared('SET FOREIGN_KEY_CHECKS=0;');
            $connection->getSchemaBuilder()->dropAllTables();
            $connection->unprepared('SET FOREIGN_KEY_CHECKS=1;');
        }

        $this->info("Importing [{$filePath}]...");

        try {
            $isGz = str_ends_with(strtolower($filePath), '.gz');
            $handle = $isGz ? gzopen($filePath, 'rb') : fopen($filePath, 'rb');

            if ($handle === false) {
                $this->error('Unable to open the file.');

                return self::FAILURE;
            }

            $connection->unprepared('SET FOREIGN_KEY_CHECKS=0;');
            $connection->unprepared('SET NAMES utf8mb4;');

            $buffer = '';
            $executedStatements = 0;

            while (! ($isGz ? gzeof($handle) : feof($handle))) {
                $line = $isGz ? gzgets($handle, 1048576) : fgets($handle, 1048576);
                if ($line === false) {
                    break;
                }

                $trimmed = trim($line);
                if ($trimmed === '' || str_starts_with($trimmed, '--') || str_starts_with($trimmed, '/*')) {
                    continue;
                }

                $buffer .= $line;

                if (str_ends_with($trimmed, ';')) {
                    $connection->unprepared($buffer);
                    $buffer = '';
                    $executedStatements++;
                }
            }

            if (trim($buffer) !== '') {
                $connection->unprepared($buffer);
                $executedStatements++;
            }

            if ($isGz) {
                gzclose($handle);
            } else {
                fclose($handle);
            }

            $connection->unprepared('SET FOREIGN_KEY_CHECKS=1;');

            $this->info("Import completed successfully! ({$executedStatements} statements executed)");

            return self::SUCCESS;
        } catch (Throwable $e) {
            $connection->unprepared('SET FOREIGN_KEY_CHECKS=1;');
            $this->error('Import failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
