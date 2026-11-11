<?php

namespace App\Services;

use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RecursiveCallbackFilterIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;
use Throwable;
use ZipArchive;

class DatabaseBackupService
{
    private const BACKUP_TYPES = ['database', 'media', 'full', 'cpanel'];

    private const CPANEL_PRIVATE_DIRECTORIES = ['app', 'bootstrap', 'config', 'lang', 'resources', 'routes', 'vendor'];

    private const COMPRESSED_FILE_EXTENSIONS = ['gz', 'jpeg', 'jpg', 'mp3', 'mp4', 'pdf', 'png', 'webm', 'webp', 'zip'];

    private const DEFAULT_BACKUP_RETENTION_DAYS = 14;

    private const MAX_BACKUP_RETENTION_DAYS = 3650;

    public function __construct(private DatabaseBackupSchemaInspector $schemaInspector) {}

    public function create(string $type = 'database'): string
    {
        if (! in_array($type, self::BACKUP_TYPES, true)) {
            throw new RuntimeException('The requested backup type is not supported.');
        }

        if ($type === 'cpanel') {
            $this->extendCpanelExecutionTime();
        }

        if ($type !== 'database' && ! class_exists(ZipArchive::class)) {
            throw new RuntimeException('Media, full, and cPanel application packages require the PHP Zip extension.');
        }

        $root = $this->backupRoot();
        $extension = $type === 'database' ? '.sql.gz' : '.zip';
        $filename = $type.'-'.now()->utc()->format('Ymd-His').'-'.bin2hex(random_bytes(8)).$extension;
        $path = $root.DIRECTORY_SEPARATOR.$filename;

        if ($type === 'database') {
            $this->writeDatabaseDump($path);
        } elseif ($type === 'media') {
            $this->writeMediaArchive($path);
        } elseif ($type === 'full') {
            $this->writeFullArchive($path, $root);
        } else {
            $this->writeCpanelArchive($path);
        }

        if (! touch($path, now()->getTimestamp())) {
            @unlink($path);
            throw new RuntimeException('The private backup timestamp could not be recorded.');
        }

        $this->restrictFilePermissions($path);

        return $path;
    }

    /** @return list<array{type: string, filename: string, size_bytes: int, created_at: string}> */
    public function history(): array
    {
        $root = $this->backupRoot(false);

        if ($root === null) {
            return [];
        }

        $files = [];

        foreach (glob($root.DIRECTORY_SEPARATOR.'*') ?: [] as $path) {
            $filename = basename($path);

            if (! is_file($path) || preg_match('/^(database|media|full|cpanel)-\d{8}-\d{6}-[a-f0-9]{16}\.(?:sql\.gz|zip)$/', $filename, $matches) !== 1) {
                continue;
            }

            $files[] = [
                'type' => $matches[1],
                'filename' => $filename,
                'size_bytes' => (int) filesize($path),
                'created_at' => date(DATE_ATOM, (int) filemtime($path)),
            ];
        }

        usort($files, static fn (array $first, array $second): int => strcmp($second['created_at'], $first['created_at']));

        return array_slice($files, 0, 30);
    }

    public function privateBackupDirectory(): string
    {
        return $this->backupRoot();
    }

    public function backupStorageStatus(): string
    {
        try {
            $backupRoot = $this->backupRoot(false);

            if ($backupRoot !== null) {
                return is_writable($backupRoot) ? 'Writable' : 'Check permissions';
            }

            return is_writable(dirname($this->configuredBackupPath()))
                ? 'Ready to create'
                : 'Check permissions';
        } catch (RuntimeException) {
            return 'Check permissions';
        }
    }

    public function retentionDays(): int
    {
        $retentionDays = config('system_health.backup_retention_days', self::DEFAULT_BACKUP_RETENTION_DAYS);

        return is_int($retentionDays) && $retentionDays >= 1 && $retentionDays <= self::MAX_BACKUP_RETENTION_DAYS
            ? $retentionDays
            : self::DEFAULT_BACKUP_RETENTION_DAYS;
    }

    public function pruneExpiredBackups(): int
    {
        $root = $this->backupRoot(false);

        if ($root === null) {
            return 0;
        }

        $cutoff = now()->subDays($this->retentionDays())->getTimestamp();
        $removed = 0;

        foreach (glob($root.DIRECTORY_SEPARATOR.'*') ?: [] as $path) {
            $filename = basename($path);

            if (is_link($path) || ! is_file($path)
                || preg_match('/^(database|media|full|cpanel)-\d{8}-\d{6}-[a-f0-9]{16}\.(?:sql\.gz|zip)$/', $filename) !== 1
                || (int) filemtime($path) >= $cutoff) {
                continue;
            }

            if (@unlink($path)) {
                $removed++;
            }
        }

        return $removed;
    }

    /** @return array{database: bool, media: bool, full: bool, cpanel: bool, restore: array{database: bool, media: bool, full: bool}} */
    public function capabilities(): array
    {
        try {
            $databaseSupported = DB::connection()->getDriverName() === 'mysql';
        } catch (Throwable) {
            $databaseSupported = false;
        }
        $zipSupported = class_exists(ZipArchive::class);

        return [
            'database' => $databaseSupported,
            'media' => $zipSupported,
            'full' => $databaseSupported && $zipSupported,
            'cpanel' => $zipSupported,
            'restore' => [
                'database' => $databaseSupported,
                'media' => $zipSupported,
                'full' => $databaseSupported && $zipSupported,
            ],
        ];
    }

    public function pathForDownload(string $filename): ?string
    {
        if (basename($filename) !== $filename
            || $this->backupTypeForFilename($filename) === null) {
            return null;
        }

        $root = $this->backupRoot(false);
        $path = $root === null ? false : realpath($root.DIRECTORY_SEPARATOR.$filename);

        if ($path === false || ! is_file($path) || ! str_starts_with($path, $root.DIRECTORY_SEPARATOR)) {
            return null;
        }

        return $path;
    }

    public function deleteBackup(string $filename): bool
    {
        if (basename($filename) !== $filename
            || $this->backupTypeForFilename($filename) === null) {
            return false;
        }

        $root = $this->backupRoot(false);

        if ($root === null) {
            return false;
        }

        $path = $root.DIRECTORY_SEPARATOR.$filename;

        if (is_link($path) || ! is_file($path)) {
            return false;
        }

        $resolvedPath = realpath($path);

        if ($resolvedPath === false || ! str_starts_with($resolvedPath, $root.DIRECTORY_SEPARATOR)) {
            return false;
        }

        return @unlink($path);
    }

    public function backupTypeForFilename(string $filename): ?string
    {
        if (preg_match('/^(database|media|full|cpanel)-\d{8}-\d{6}-[a-f0-9]{16}\.(?:sql\.gz|zip)$/', $filename, $matches) !== 1) {
            return null;
        }

        return $matches[1];
    }

    private function writeDatabaseDump(string $path): void
    {
        $connection = DB::connection();

        if ($connection->getDriverName() !== 'mysql') {
            throw new RuntimeException('Database backups are supported only for MySQL connections.');
        }

        $placeholder = fopen($path, 'x+b');

        if ($placeholder === false) {
            throw new RuntimeException('Could not create the private backup file.');
        }

        fclose($placeholder);
        $this->restrictFilePermissions($path);
        $stream = gzopen($path, 'wb9');

        if ($stream === false) {
            @unlink($path);
            throw new RuntimeException('Could not open the private backup file.');
        }

        try {
            $this->schemaInspector->assertSupportedObjects($connection);
            $this->write($stream, '-- Clinic System logical database backup. Restore only through a reviewed recovery procedure.');
            $this->write($stream, '-- Generated at '.now()->utc()->toIso8601String());
            $this->write($stream, 'SET NAMES utf8mb4;');
            $this->write($stream, 'SET FOREIGN_KEY_CHECKS=0;');
            $connection->statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');

            $connection->transaction(function () use ($connection, $stream): void {
                $tables = $this->schemaInspector->tables($connection);

                foreach ($tables as $table) {
                    if (strtolower((string) ($table['engine'] ?? '')) !== 'innodb') {
                        throw new RuntimeException('Database backup stopped because a table does not use InnoDB.');
                    }
                }

                foreach ($tables as $table) {
                    $this->write($stream, $this->createTableStatement($connection, $table['name']));
                }

                foreach ($tables as $table) {
                    $this->writeTableRows($connection, $table['name'], $stream);
                }
            });

            $this->write($stream, 'SET FOREIGN_KEY_CHECKS=1;');
        } catch (Throwable $exception) {
            gzclose($stream);
            @unlink($path);
            throw $exception;
        }

        if (! gzclose($stream)) {
            @unlink($path);
            throw new RuntimeException('The database backup could not be finalized.');
        }
    }

    private function writeMediaArchive(string $path): void
    {
        $archive = new ZipArchive;

        if ($archive->open($path, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
            throw new RuntimeException('Could not create the media backup archive.');
        }

        try {
            $this->addDirectoryToArchive(
                $archive,
                Storage::disk('public')->path(''),
                'uploads',
            );
            if (! $archive->close()) {
                throw new RuntimeException('The media backup archive could not be finalized.');
            }
        } catch (Throwable $exception) {
            $archive->close();
            @unlink($path);
            throw $exception;
        }
    }

    private function writeFullArchive(string $path, string $root): void
    {
        $databasePath = $root.DIRECTORY_SEPARATOR.'.'.bin2hex(random_bytes(16)).'.sql.gz';
        $mediaPath = $root.DIRECTORY_SEPARATOR.'.'.bin2hex(random_bytes(16)).'.zip';
        $archive = new ZipArchive;
        $archiveIsOpen = false;
        $databaseCreated = false;
        $mediaCreated = false;
        $fullArchiveCreated = false;

        try {
            $this->writeDatabaseDump($databasePath);
            $databaseCreated = true;
            $this->writeMediaArchive($mediaPath);
            $mediaCreated = true;

            if ($archive->open($path, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
                throw new RuntimeException('Could not create the full backup archive.');
            }
            $archiveIsOpen = true;
            $fullArchiveCreated = true;

            if (! $this->addStoredFileToArchive($archive, $databasePath, 'database.sql.gz')
                || ! $this->addStoredFileToArchive($archive, $mediaPath, 'media.zip')) {
                throw new RuntimeException('Could not add all components to the full backup archive.');
            }

            if (! $archive->close()) {
                throw new RuntimeException('The full backup archive could not be finalized.');
            }
            $archiveIsOpen = false;
        } catch (Throwable $exception) {
            if ($archiveIsOpen) {
                $archive->close();
                $archiveIsOpen = false;
            }

            if ($fullArchiveCreated) {
                @unlink($path);
            }
            throw $exception;
        } finally {
            if ($archiveIsOpen) {
                $archive->close();
            }

            foreach ([[$databasePath, $databaseCreated], [$mediaPath, $mediaCreated]] as [$temporaryPath, $wasCreated]) {
                if ($wasCreated && is_file($temporaryPath)) {
                    @unlink($temporaryPath);
                }
            }
        }
    }

    private function writeCpanelArchive(string $path): void
    {
        $archive = new ZipArchive;
        $archiveIsOpen = false;
        $backupCreated = false;

        try {
            if ($archive->open($path, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
                throw new RuntimeException('Could not create the cPanel application package.');
            }
            $archiveIsOpen = true;
            $backupCreated = true;

            $this->writeCpanelApplicationBundle($archive);

            if (! $archive->close()) {
                throw new RuntimeException('The cPanel application package could not be finalized.');
            }
            $archiveIsOpen = false;
        } catch (Throwable $exception) {
            if ($archiveIsOpen) {
                $archive->close();
                $archiveIsOpen = false;
            }

            if ($backupCreated) {
                @unlink($path);
            }

            throw $exception;
        } finally {
            if ($archiveIsOpen) {
                $archive->close();
            }
        }
    }

    private function writeCpanelApplicationBundle(ZipArchive $archive): void
    {
        $sourceRoot = realpath(base_path());
        $publicRoot = realpath(public_path());

        if ($sourceRoot === false || $publicRoot === false) {
            throw new RuntimeException('The application directory could not be verified.');
        }

        foreach (['artisan', 'composer.json', 'composer.lock', '.env.production.example'] as $file) {
            $this->addFileToArchive($archive, $sourceRoot.DIRECTORY_SEPARATOR.$file, 'private/'.$file);
        }

        foreach (self::CPANEL_PRIVATE_DIRECTORIES as $directory) {
            $directoryPath = $sourceRoot.DIRECTORY_SEPARATOR.$directory;

            if (is_dir($directoryPath)) {
                $this->addDirectoryContentsToArchive(
                    $archive,
                    $directoryPath,
                    'private/'.$directory,
                    $directory === 'bootstrap' ? ['cache'] : [],
                );
            }
        }

        $migrationsPath = $sourceRoot.DIRECTORY_SEPARATOR.'database'.DIRECTORY_SEPARATOR.'migrations';

        if (is_dir($migrationsPath)) {
            $this->addDirectoryContentsToArchive($archive, $migrationsPath, 'private/database/migrations');
        }

        $bootstrapCache = $sourceRoot.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache';

        foreach (['packages.php', 'services.php'] as $manifest) {
            $manifestPath = $bootstrapCache.DIRECTORY_SEPARATOR.$manifest;

            if (is_file($manifestPath)) {
                $this->addFileToArchive($archive, $manifestPath, 'private/bootstrap/cache/'.$manifest);
            }
        }

        foreach ([
            'private/storage/app/public/.keep',
            'private/storage/framework/cache/data/.keep',
            'private/storage/framework/sessions/.keep',
            'private/storage/framework/views/.keep',
            'private/storage/logs/.keep',
        ] as $archivePath) {
            $this->addEmptyFileToArchive($archive, $archivePath);
        }

        $storageHtaccess = $sourceRoot.DIRECTORY_SEPARATOR.'storage'.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.'.htaccess';

        if (is_file($storageHtaccess)) {
            $this->addFileToArchive($archive, $storageHtaccess, 'private/storage/app/public/.htaccess');
        }

        $this->addDirectoryContentsToArchive($archive, $publicRoot, 'public_html', ['storage', 'hot', 'index.php']);
        $entryPoint = $sourceRoot.DIRECTORY_SEPARATOR.'deploy'.DIRECTORY_SEPARATOR.'cpanel'.DIRECTORY_SEPARATOR.'index.php';
        $this->addFileToArchive($archive, $entryPoint, 'public_html/index.php');

        $installationGuide = $sourceRoot.DIRECTORY_SEPARATOR.'docs'.DIRECTORY_SEPARATOR.'deployment'.DIRECTORY_SEPARATOR.'cpanel-file-manager.md';

        if (is_file($installationGuide)) {
            $this->addFileToArchive($archive, $installationGuide, 'INSTALLATION.md');
        }
    }

    /** @param list<string> $excludedNames */
    private function addDirectoryContentsToArchive(ZipArchive $archive, string $directory, string $archivePrefix, array $excludedNames = []): void
    {
        if (! is_dir($directory) || is_link($directory)) {
            return;
        }

        $realDirectory = realpath($directory);

        if ($realDirectory === false) {
            throw new RuntimeException('A deployment directory could not be verified.');
        }

        $directoryIterator = new RecursiveDirectoryIterator($realDirectory, RecursiveDirectoryIterator::SKIP_DOTS);
        $filteredIterator = new RecursiveCallbackFilterIterator(
            $directoryIterator,
            function (\SplFileInfo $entry) use ($realDirectory, $excludedNames): bool {
                $relativePath = substr($entry->getPathname(), strlen($realDirectory) + 1);
                $topLevelEntry = explode(DIRECTORY_SEPARATOR, $relativePath)[0];

                return ! in_array($entry->getFilename(), $excludedNames, true)
                    && ! in_array($topLevelEntry, $excludedNames, true);
            },
        );
        $iterator = new RecursiveIteratorIterator(
            $filteredIterator,
            RecursiveIteratorIterator::LEAVES_ONLY,
        );

        foreach ($iterator as $entry) {
            if ($entry->isLink() || ! $entry->isFile() || in_array($entry->getFilename(), $excludedNames, true)) {
                continue;
            }

            $realFile = realpath($entry->getPathname());

            if ($realFile === false || ! str_starts_with($realFile, $realDirectory.DIRECTORY_SEPARATOR)) {
                continue;
            }

            $relativePath = str_replace(DIRECTORY_SEPARATOR, '/', substr($realFile, strlen($realDirectory) + 1));
            $this->addFileToArchive($archive, $realFile, trim($archivePrefix, '/').'/'.$relativePath);
        }
    }

    private function addFileToArchive(ZipArchive $archive, string $path, string $archivePath): void
    {
        if (! is_file($path) || is_link($path) || ! $archive->addFile($path, $archivePath)) {
            throw new RuntimeException('A deployment file could not be added to the cPanel application package.');
        }

        if (in_array(strtolower(pathinfo($archivePath, PATHINFO_EXTENSION)), self::COMPRESSED_FILE_EXTENSIONS, true)
            && ! $archive->setCompressionName($archivePath, ZipArchive::CM_STORE)) {
            throw new RuntimeException('A deployment file could not be optimized in the cPanel application package.');
        }
    }

    private function addEmptyFileToArchive(ZipArchive $archive, string $archivePath): void
    {
        if (! $archive->addFromString($archivePath, '')) {
            throw new RuntimeException('A deployment directory marker could not be added to the cPanel application package.');
        }
    }

    private function addDirectoryToArchive(ZipArchive $archive, string $directory, string $archivePrefix): void
    {
        if (! is_dir($directory) || is_link($directory)) {
            return;
        }

        $realDirectory = realpath($directory);

        if ($realDirectory === false) {
            throw new RuntimeException('The media storage directory could not be verified.');
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($realDirectory, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($iterator as $entry) {
            if ($entry->isLink() || ! $entry->isFile()) {
                continue;
            }

            $realFile = realpath($entry->getPathname());

            if ($realFile === false || ! str_starts_with($realFile, $realDirectory.DIRECTORY_SEPARATOR)) {
                continue;
            }

            $relativePath = substr($realFile, strlen($realDirectory) + 1);
            $archivePath = $archivePrefix.'/'.str_replace(DIRECTORY_SEPARATOR, '/', $relativePath);

            if (! $archive->addFile($realFile, $archivePath)) {
                throw new RuntimeException('A media file could not be added to the backup archive.');
            }
        }
    }

    private function addStoredFileToArchive(ZipArchive $archive, string $path, string $archivePath): bool
    {
        return $archive->addFile($path, $archivePath)
            && $archive->setCompressionName($archivePath, ZipArchive::CM_STORE);
    }

    private function extendCpanelExecutionTime(): void
    {
        if (PHP_SAPI === 'cli') {
            return;
        }

        $seconds = config('system_health.cpanel_execution_seconds', 900);

        if (is_int($seconds) && $seconds >= 30 && $seconds <= 3600) {
            @set_time_limit($seconds);
        }
    }

    private function backupRoot(bool $create = true): ?string
    {
        $backupRoot = $this->configuredBackupPath();

        if ($create && ! is_dir($backupRoot) && ! mkdir($backupRoot, 0700, true) && ! is_dir($backupRoot)) {
            throw new RuntimeException('Private backup storage is unavailable.');
        }

        if (! is_dir($backupRoot)) {
            return null;
        }

        $realBackupRoot = realpath($backupRoot);
        $realPublicRoot = realpath(public_path());

        if ($realBackupRoot === false || $realPublicRoot === false) {
            throw new RuntimeException('Could not verify the private backup location.');
        }

        $publicPrefix = rtrim($realPublicRoot, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;

        if ($realBackupRoot === $realPublicRoot || str_starts_with($realBackupRoot.DIRECTORY_SEPARATOR, $publicPrefix)) {
            throw new RuntimeException('The configured backup path is publicly accessible.');
        }

        return $realBackupRoot;
    }

    private function configuredBackupPath(): string
    {
        $configuredPath = config('system_health.backup_path');

        if (is_string($configuredPath) && trim($configuredPath) !== '') {
            $backupPath = trim($configuredPath);

            if (! $this->isAbsolutePath($backupPath)) {
                throw new RuntimeException('The configured backup path must be absolute.');
            }

            return rtrim($backupPath, '/\\');
        }

        $storageRoot = Storage::disk('local')->path('');

        return rtrim($storageRoot, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'system-backups';
    }

    private function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, '/') || preg_match('/^[A-Za-z]:[\\\\\/]/', $path) === 1;
    }

    private function restrictFilePermissions(string $path): void
    {
        if (DIRECTORY_SEPARATOR !== '\\' && ! chmod($path, 0600)) {
            @unlink($path);
            throw new RuntimeException('Could not restrict access to the private backup file.');
        }
    }

    private function createTableStatement(Connection $connection, string $tableName): string
    {
        $definition = $connection->selectOne('SHOW CREATE TABLE `'.str_replace('`', '``', $tableName).'`');
        $createStatement = $definition === null ? null : (array_values((array) $definition)[1] ?? null);

        if (! is_string($createStatement) || $createStatement === '') {
            throw new RuntimeException('A database table definition could not be verified.');
        }

        return $createStatement.';';
    }

    /** @param resource $stream */
    private function writeTableRows(Connection $connection, string $tableName, $stream): void
    {
        $columns = array_values(array_filter(
            Schema::connection($connection->getName())->getColumns($tableName),
            fn (array $column): bool => empty($column['generation']),
        ));
        $columnNames = array_column($columns, 'name');

        if ($columnNames === []) {
            return;
        }

        $binaryColumns = [];

        foreach ($columns as $column) {
            if (preg_match('/blob|binary|geometry|\bbit\b/i', (string) ($column['type'] ?? '')) === 1) {
                $binaryColumns[$column['name']] = true;
            }
        }

        $quotedColumns = array_map(fn (string $column): string => $this->quoteIdentifier($column), $columnNames);
        $quotedTable = $this->quoteIdentifier($tableName);

        foreach ($connection->table($tableName)->cursor() as $row) {
            $values = [];

            foreach ($columnNames as $columnName) {
                $value = $row->{$columnName};

                if (is_resource($value)) {
                    $value = stream_get_contents($value);
                }

                if ($value === null) {
                    $values[] = 'NULL';
                } elseif (isset($binaryColumns[$columnName])) {
                    $values[] = "X'".bin2hex((string) $value)."'";
                } else {
                    $values[] = "CONVERT(X'".bin2hex((string) $value)."' USING utf8mb4)";
                }
            }

            $this->write($stream, 'INSERT INTO '.$quotedTable.' ('.implode(', ', $quotedColumns).') VALUES ('.implode(', ', $values).');');
        }
    }

    private function quoteIdentifier(string $identifier): string
    {
        return '`'.str_replace('`', '``', $identifier).'`';
    }

    /** @param resource $stream */
    private function write($stream, string $line): void
    {
        if (gzwrite($stream, $line."\n") === false) {
            throw new RuntimeException('The database backup could not be written.');
        }
    }
}
