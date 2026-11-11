<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Throwable;

class SystemHealthSnapshotService
{
    public function __construct(
        private SystemHealthBackupScheduleService $backupScheduleService,
        private DatabaseBackupService $backupService,
    ) {}

    /** @return array<string, mixed> */
    public function snapshot(): array
    {
        $database = $this->databaseStatus();
        $backupSchedule = $this->backupScheduleService->settings();
        $privateRoot = Storage::disk('local')->path('');
        $uploadRoot = Storage::disk('public')->path('');
        $storageRoot = storage_path();

        return [
            'application' => 'Running',
            'environment' => app()->environment(),
            'debug' => (bool) config('app.debug'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'database' => $database,
            'private_storage' => is_dir($privateRoot) && is_writable($privateRoot) ? 'Writable' : 'Check permissions',
            'backup_storage' => $this->backupService->backupStorageStatus(),
            'migrations' => $database['status'] === 'Connected'
                ? $this->migrationStatus()
                : ['applied' => null, 'total' => $this->migrationFileCount(), 'pending' => null, 'status' => 'Unavailable'],
            'storage' => [
                'uploads' => $this->directorySummary($uploadRoot, ['.htaccess', '.keep']),
                'private' => $this->directorySummary($privateRoot),
                'logs' => $this->directorySummary(storage_path('logs')),
                'framework_cache' => $this->directorySummary(storage_path('framework/cache')),
                'build_assets' => $this->directorySummary(public_path('build')),
                'total' => $this->directorySummary($storageRoot),
            ],
            'scheduler' => [
                'configured' => $backupSchedule['valid'],
                'enabled' => $backupSchedule['enabled'],
                'backup_time' => $backupSchedule['time'],
                'timezone' => $backupSchedule['timezone'],
                'summary' => ! $backupSchedule['valid']
                    ? 'Automatic backup scheduling is disabled because its private settings file is invalid. Save valid settings to resume it.'
                    : ($backupSchedule['enabled']
                        ? "A full database and media backup runs daily at {$backupSchedule['time']} ({$backupSchedule['timezone']}); expired archives are pruned after a successful run."
                        : 'Automatic full backups are disabled. Manual backups remain available.'),
                'backup_type' => 'full',
            ],
            'backup_retention' => "Retention: {$this->backupService->retentionDays()} days. Generated backup archives older than this are removed after a successful backup run.",
        ];
    }

    /** @return array{status: string, size_bytes: int|null, name: string|null, table_count: int|null, view_count: int|null} */
    private function databaseStatus(): array
    {
        try {
            $connection = DB::connection();
            $connection->select('select 1');
            $databaseName = $connection->getDatabaseName();
            $schema = Schema::connection($connection->getName());
            $driver = $connection->getDriverName();

            if ($driver === 'mysql' && (! is_string($databaseName) || $databaseName === '')) {
                throw new \RuntimeException('Could not verify the selected database.');
            }

            $tableCount = count($connection->getDriverName() === 'mysql'
                ? $schema->getTables($databaseName)
                : $schema->getTables());
            $viewCount = count(match ($driver) {
                'mysql' => $schema->getViews($databaseName),
                'sqlite' => $schema->getViews('main'),
                default => [],
            });

            $sizeBytes = null;

            if ($connection->getDriverName() === 'mysql') {
                $sizeBytes = (int) ($connection->selectOne(
                    'SELECT COALESCE(SUM(DATA_LENGTH + INDEX_LENGTH), 0) AS size_bytes FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
                )->size_bytes ?? 0);
            } elseif ($connection->getDriverName() === 'sqlite') {
                $databasePath = config('database.connections.sqlite.database');
                $sizeBytes = is_string($databasePath) && $databasePath !== ':memory:' && is_file($databasePath)
                    ? (int) filesize($databasePath)
                    : null;
            }

            return [
                'status' => 'Connected',
                'size_bytes' => $sizeBytes,
                'name' => $databaseName,
                'table_count' => $tableCount,
                'view_count' => $viewCount,
            ];
        } catch (Throwable) {
            return ['status' => 'Unavailable', 'size_bytes' => null, 'name' => null, 'table_count' => null, 'view_count' => null];
        }
    }

    /** @return array{applied: int|null, total: int, pending: int|null, status: string} */
    private function migrationStatus(): array
    {
        $total = $this->migrationFileCount();

        try {
            if (! Schema::hasTable('migrations')) {
                return ['applied' => 0, 'total' => $total, 'pending' => $total, 'status' => 'Ledger missing'];
            }

            $applied = (int) DB::table('migrations')->distinct()->count('migration');
            $pending = max(0, $total - $applied);

            return [
                'applied' => $applied,
                'total' => $total,
                'pending' => $pending,
                'status' => $pending === 0 && $applied === $total ? 'Up to date' : 'Review required',
            ];
        } catch (Throwable) {
            return ['applied' => null, 'total' => $total, 'pending' => null, 'status' => 'Unavailable'];
        }
    }

    private function migrationFileCount(): int
    {
        return count(glob(database_path('migrations/*.php')) ?: []);
    }

    /**
     * @param  list<string>  $ignoredFiles
     * @return array{files: int, bytes: int}
     */
    private function directorySummary(string $path, array $ignoredFiles = []): array
    {
        if (! is_dir($path) || is_link($path)) {
            return ['files' => 0, 'bytes' => 0];
        }

        $files = 0;
        $bytes = 0;

        try {
            $realPath = realpath($path);

            if ($realPath === false) {
                return ['files' => 0, 'bytes' => 0];
            }

            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($realPath, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST,
            );

            foreach ($iterator as $entry) {
                $relativePath = substr($entry->getPathname(), strlen($realPath) + 1);
                $isRootFile = ! str_contains($relativePath, DIRECTORY_SEPARATOR);

                if ($entry->isLink() || ! $entry->isFile() || ($isRootFile && in_array($entry->getFilename(), $ignoredFiles, true))) {
                    continue;
                }

                $files++;
                $bytes += (int) $entry->getSize();
            }
        } catch (Throwable) {
            return ['files' => 0, 'bytes' => 0];
        }

        return ['files' => $files, 'bytes' => $bytes];
    }
}
