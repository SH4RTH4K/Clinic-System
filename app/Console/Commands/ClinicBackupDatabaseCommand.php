<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('clinic:backup-database')]
#[Description('Create an automated database backup for cPanel Cron Jobs and prune expired archives')]
class ClinicBackupDatabaseCommand extends Command
{
    public function handle(DatabaseBackupService $backupService): int
    {
        try {
            $path = $backupService->create('database');
            $removed = $backupService->pruneExpiredBackups();
        } catch (Throwable $exception) {
            Log::error('Clinic database backup failed: '.$exception->getMessage(), [
                'exception_class' => $exception::class,
            ]);
            $this->error('Database backup failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Database backup successfully generated: '.basename($path));
        if ($removed > 0) {
            $this->info("Pruned {$removed} expired backup archive(s).");
        }

        return self::SUCCESS;
    }
}
