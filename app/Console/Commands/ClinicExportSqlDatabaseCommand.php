<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

#[Signature('clinic:export-sql {--path= : Target SQL file path (defaults to database/sql/remediq_live_export.sql)}')]
#[Description('Export current clinic database to a clean, phpMyAdmin-ready uncompressed UTF-8 SQL file')]
class ClinicExportSqlDatabaseCommand extends Command
{
    public function handle(DatabaseBackupService $backupService): int
    {
        $this->info('Starting database export...');

        try {
            $gzPath = $backupService->create('database');

            $targetPath = $this->option('path')
                ? (string) $this->option('path')
                : base_path('database/sql/remediq_live_export.sql');

            $targetDir = dirname($targetPath);
            if (! is_dir($targetDir)) {
                mkdir($targetDir, 0755, true);
            }

            $gz = gzopen($gzPath, 'rb');
            if ($gz === false) {
                $this->error('Failed to open generated compressed backup.');

                return self::FAILURE;
            }

            $out = fopen($targetPath, 'wb');
            if ($out === false) {
                gzclose($gz);
                $this->error("Failed to open destination file: {$targetPath}");

                return self::FAILURE;
            }

            while (! gzeof($gz)) {
                $chunk = gzread($gz, 65536);
                if ($chunk === false) {
                    break;
                }
                fwrite($out, $chunk);
            }

            gzclose($gz);
            fclose($out);

            $fileSizeKb = round(filesize($targetPath) / 1024, 2);
            $this->info("Database exported successfully ({$fileSizeKb} KB):");
            $this->line("  -> <comment>{$targetPath}</comment>");
            $this->info('You can directly import this file into phpMyAdmin or via MySQL CLI on your live server.');

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error('Export failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
