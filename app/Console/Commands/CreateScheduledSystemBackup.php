<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('system-health:backup {type=full : The backup type (database, media, full, or cpanel application package)}')]
#[Description('Create a private system backup')]
class CreateScheduledSystemBackup extends Command
{
    public function handle(DatabaseBackupService $backupService): int
    {
        try {
            $path = $backupService->create((string) $this->argument('type'));
            $removed = $backupService->pruneExpiredBackups();
        } catch (Throwable $exception) {
            Log::error('System backup creation failed.', ['exception_class' => $exception::class]);
            $this->error('Backup creation failed. Review the application logs.');

            return self::FAILURE;
        }

        $this->info('Created backup: '.basename($path));
        $this->info("Removed {$removed} expired backup(s).");

        return self::SUCCESS;
    }
}
