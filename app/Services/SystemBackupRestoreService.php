<?php

namespace App\Services;

use Illuminate\Database\ConfigurationUrlParser;
use Illuminate\Database\Connection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;
use ZipArchive;

class SystemBackupRestoreService
{
    private const MAX_MEDIA_ARCHIVE_BYTES = 2147483648;

    private const MAX_UPLOAD_BYTES = 2147483648;

    private const MAX_DATABASE_DUMP_BYTES = 8589934592;

    public function __construct(private DatabaseBackupSchemaInspector $schemaInspector) {}

    public function restore(string $filename, string $type, ?string $targetDatabase = null): void
    {
        $backupService = app(DatabaseBackupService::class);
        $backupPath = $backupService->pathForDownload($filename);

        if ($backupPath === null || ! in_array($type, ['database', 'media', 'full'], true)
            || ! str_starts_with($filename, $type.'-')) {
            throw new RuntimeException('The selected backup is not available for restoration.');
        }

        $this->restoreFromPath($backupPath, $type, $targetDatabase);
    }

    public function restoreUploaded(UploadedFile $uploadedFile, string $type, ?string $targetDatabase = null): void
    {
        if (! in_array($type, ['database', 'media', 'full'], true)) {
            throw new RuntimeException('The selected backup type is not supported.');
        }

        $fileSize = $uploadedFile->getSize();

        if (! is_int($fileSize) || $fileSize < 1 || $fileSize > self::MAX_UPLOAD_BYTES) {
            throw new RuntimeException('The uploaded backup file is empty or exceeds the 2 GB upload limit.');
        }

        $originalFilename = basename($uploadedFile->getClientOriginalName());
        $expectedFilenamePattern = match ($type) {
            'database' => '/\.sql\.gz$/iD',
            'media', 'full' => '/\.zip$/iD',
        };

        if (preg_match($expectedFilenamePattern, $originalFilename) !== 1) {
            throw new RuntimeException('The uploaded backup file extension does not match the selected backup type.');
        }

        $backupService = app(DatabaseBackupService::class);
        $backupRoot = $backupService->privateBackupDirectory();
        $extension = $type === 'database' ? 'sql.gz' : 'zip';
        $temporaryFilename = '.restore-upload-'.bin2hex(random_bytes(16)).'.'.$extension;
        $temporaryPath = $backupRoot.DIRECTORY_SEPARATOR.$temporaryFilename;

        try {
            $uploadedFile->move($backupRoot, $temporaryFilename);

            if (DIRECTORY_SEPARATOR !== '\\' && ! chmod($temporaryPath, 0600)) {
                throw new RuntimeException('The uploaded backup could not be protected in private storage.');
            }

            $this->assertUploadedArchiveIsReadable($temporaryPath, $type);
            $this->restoreFromPath($temporaryPath, $type, $targetDatabase);
        } finally {
            if (is_file($temporaryPath)) {
                @unlink($temporaryPath);
            }
        }
    }

    private function restoreFromPath(string $backupPath, string $type, ?string $targetDatabase): void
    {
        if ($type !== 'database' && ! class_exists(ZipArchive::class)) {
            throw new RuntimeException('The PHP Zip extension is required to restore media backups.');
        }

        $connection = DB::connection();
        $temporaryConnectionName = null;

        if (in_array($type, ['database', 'full'], true) && is_string($targetDatabase) && $targetDatabase !== '') {
            [$connection, $temporaryConnectionName] = $this->connectionForTargetDatabase($targetDatabase);
        }

        $uploadRoot = null;
        $stagedMedia = null;
        $databaseDump = null;

        try {
            $this->assertEmptyDatabase($connection, $type);
            $uploadRoot = Storage::disk('public')->path('');

            if ($type === 'media') {
                $this->assertEmptyUploadStorage();
                $stagedMedia = $this->stageMediaArchive($backupPath);
            } elseif ($type === 'database') {
                $databaseDump = $backupPath;
            } else {
                $this->assertEmptyUploadStorage();
                [$databaseDump, $stagedMedia] = $this->stageFullArchive($backupPath);
            }

            if ($databaseDump !== null) {
                $this->assertDatabaseDumpIsReadable($databaseDump);
                $this->restoreDatabaseDump($databaseDump, $connection);
            }

            if ($stagedMedia !== null && is_string($uploadRoot)) {
                $this->restoreStagedMedia($stagedMedia, $uploadRoot);
            }
        } finally {
            if ($type === 'full' && is_string($databaseDump) && is_file($databaseDump)) {
                @unlink($databaseDump);
            }

            if (is_string($stagedMedia) && is_dir($stagedMedia)) {
                $this->removeDirectory($stagedMedia);
            }

            if ($temporaryConnectionName !== null) {
                DB::purge($temporaryConnectionName);
                config(["database.connections.{$temporaryConnectionName}" => null]);
            }
        }
    }

    private function assertUploadedArchiveIsReadable(string $path, string $type): void
    {
        if ($type === 'database') {
            return;
        }

        $archive = new ZipArchive;

        if ($archive->open($path) !== true) {
            throw new RuntimeException('The uploaded backup is not a readable ZIP archive.');
        }

        if ($type === 'full') {
            $entries = [];

            for ($index = 0; $index < $archive->numFiles; $index++) {
                $entryName = $archive->getNameIndex($index);

                if (is_string($entryName)) {
                    $entries[] = $entryName;
                }
            }

            sort($entries);

            if ($entries !== ['database.sql.gz', 'media.zip']) {
                $archive->close();
                throw new RuntimeException('The uploaded full backup has an unexpected archive structure.');
            }
        }

        $archive->close();
    }

    private function assertDatabaseDumpIsReadable(string $path): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            throw new RuntimeException('Database restore is supported only for MySQL connections.');
        }

        $stream = @gzopen($path, 'rb');

        if ($stream === false) {
            throw new RuntimeException('The database backup is not a readable compressed SQL file.');
        }

        set_error_handler(static function (): never {
            throw new RuntimeException('The compressed database backup is incomplete or damaged.');
        });

        try {
            $header = @gzgets($stream);

            if (! is_string($header) || ! str_starts_with($header, '-- Clinic System logical database backup.')) {
                throw new RuntimeException('The database backup was not created by this application.');
            }
        } finally {
            if (is_resource($stream)) {
                gzclose($stream);
            }
        }

        $statementCount = 0;
        $allowedStatement = '/\A(?:SET\s+NAMES\s+utf8mb4|SET\s+FOREIGN_KEY_CHECKS\s*=\s*[01]|CREATE\s+TABLE\b|INSERT\s+INTO\b)/i';

        foreach ($this->databaseStatements($path) as $statement) {
            if (preg_match($allowedStatement, $statement) !== 1) {
                throw new RuntimeException('The database backup contains a statement that is not allowed for restore.');
            }

            $statementCount++;
        }

        if ($statementCount === 0) {
            throw new RuntimeException('The database backup does not contain a restorable schema.');
        }
    }

    /** @return \Generator<int, string> */
    private function databaseStatements(string $path): \Generator
    {
        $stream = @gzopen($path, 'rb');

        if ($stream === false) {
            throw new RuntimeException('The database backup is not a readable compressed SQL file.');
        }

        $quote = null;
        $statement = '';
        $totalBytes = 0;

        try {
            while (($line = @gzgets($stream)) !== false) {
                $totalBytes += strlen($line);

                if ($totalBytes > self::MAX_DATABASE_DUMP_BYTES) {
                    throw new RuntimeException('The database backup expands beyond the 8 GB safety limit.');
                }

                if ($statement === '' && str_starts_with(ltrim($line), '--')) {
                    continue;
                }

                $length = strlen($line);

                for ($index = 0; $index < $length; $index++) {
                    $character = $line[$index];
                    $statement .= $character;

                    if ($quote !== null) {
                        if ($character === '\\') {
                            if ($index + 1 < $length) {
                                $statement .= $line[++$index];
                            }

                            continue;
                        }

                        if ($character === $quote) {
                            if ($index + 1 < $length && $line[$index + 1] === $quote) {
                                $statement .= $line[++$index];
                            } else {
                                $quote = null;
                            }
                        }

                        continue;
                    }

                    if (in_array($character, ["'", '"', '`'], true)) {
                        $quote = $character;
                    } elseif ($character === ';') {
                        $sql = trim(substr($statement, 0, -1));
                        $statement = '';

                        if ($sql !== '') {
                            yield $sql;
                        }
                    }
                }
            }

            if (! gzeof($stream) || trim($statement) !== '' || $quote !== null) {
                throw new RuntimeException('The database backup is incomplete or damaged.');
            }

            if (! gzclose($stream)) {
                $stream = false;
                throw new RuntimeException('The database backup is incomplete or damaged.');
            }

            $stream = false;
        } finally {
            if (is_resource($stream)) {
                gzclose($stream);
            }
        }
    }

    /** @return array{Connection, string|null} */
    private function connectionForTargetDatabase(string $targetDatabase): array
    {
        $sourceConnection = DB::connection();

        if ($sourceConnection->getDriverName() !== 'mysql'
            || preg_match('/^[A-Za-z0-9_]{1,64}$/D', $targetDatabase) !== 1) {
            throw new RuntimeException('The restore target must be an existing database on the configured MySQL server.');
        }

        if ($targetDatabase === $sourceConnection->getDatabaseName()) {
            return [$sourceConnection, null];
        }

        $connectionName = 'system_health_restore_target';
        $targetConfiguration = config("database.connections.{$sourceConnection->getName()}");

        if (! is_array($targetConfiguration) || ($targetConfiguration['driver'] ?? null) !== 'mysql') {
            throw new RuntimeException('The configured MySQL connection could not be used for the restore target.');
        }

        $targetConfiguration = (new ConfigurationUrlParser)->parseConfiguration($targetConfiguration);
        $targetConfiguration['database'] = $targetDatabase;
        $targetConfiguration['url'] = null;

        foreach (['read', 'write'] as $connectionType) {
            if (is_array($targetConfiguration[$connectionType] ?? null)) {
                $targetConfiguration[$connectionType]['database'] = $targetDatabase;
            }
        }

        config(["database.connections.{$connectionName}" => $targetConfiguration]);
        DB::purge($connectionName);

        try {
            $targetConnection = DB::connection($connectionName);

            if ($targetConnection->getDriverName() !== 'mysql' || $targetConnection->getDatabaseName() !== $targetDatabase) {
                throw new RuntimeException('The configured MySQL connection did not select the requested restore target.');
            }

            return [$targetConnection, $connectionName];
        } catch (Throwable $exception) {
            DB::purge($connectionName);
            config(["database.connections.{$connectionName}" => null]);

            throw $exception;
        }
    }

    private function assertEmptyDatabase(Connection $connection, string $type): void
    {
        if (in_array($type, ['database', 'full'], true)) {
            if ($connection->getDriverName() !== 'mysql') {
                throw new RuntimeException('Database restore is supported only for MySQL connections.');
            }

            if ($this->schemaInspector->tables($connection) !== [] || $this->schemaInspector->views($connection) !== []) {
                throw new RuntimeException('Database restore is allowed only when the selected database has no tables or views.');
            }
        }
    }

    private function assertEmptyUploadStorage(): void
    {
        $uploadRoot = Storage::disk('public')->path('');

        if (is_link($uploadRoot)) {
            throw new RuntimeException('Media restore stopped because upload storage is a symbolic link.');
        }

        $entries = is_dir($uploadRoot)
            ? array_diff(scandir($uploadRoot) ?: [], ['.', '..', '.htaccess', '.keep'])
            : [];

        if ($entries !== []) {
            throw new RuntimeException('Media restore is allowed only when upload storage contains no files.');
        }
    }

    /** @return array{string, string} */
    private function stageFullArchive(string $path): array
    {
        $archive = new ZipArchive;

        if ($archive->open($path) !== true) {
            throw new RuntimeException('The full backup archive could not be opened.');
        }

        $databaseIndex = $archive->locateName('database.sql.gz');
        $mediaIndex = $archive->locateName('media.zip');

        if ($databaseIndex === false || $mediaIndex === false || $archive->numFiles !== 2) {
            $archive->close();
            throw new RuntimeException('The full backup archive has an unexpected structure.');
        }

        $databasePath = $this->temporaryPrivatePath('.restore-'.bin2hex(random_bytes(16)).'.sql.gz');
        $mediaPath = $this->temporaryPrivatePath('.restore-'.bin2hex(random_bytes(16)).'.zip');
        $stagedMedia = null;

        try {
            $this->copyZipEntryToFile($archive, 'database.sql.gz', $databasePath);
            $this->copyZipEntryToFile($archive, 'media.zip', $mediaPath);
            $archive->close();
            $stagedMedia = $this->stageMediaArchive($mediaPath);
        } catch (Throwable $exception) {
            $archive->close();
            @unlink($databasePath);
            @unlink($mediaPath);

            if ($stagedMedia !== null) {
                $this->removeDirectory($stagedMedia);
            }

            throw $exception;
        }

        @unlink($mediaPath);

        return [$databasePath, $stagedMedia];
    }

    private function stageMediaArchive(string $path): string
    {
        $archive = new ZipArchive;

        if ($archive->open($path) !== true) {
            throw new RuntimeException('The media backup archive could not be opened.');
        }

        $totalBytes = 0;
        $entries = [];

        for ($index = 0; $index < $archive->numFiles; $index++) {
            $entry = $archive->statIndex($index);
            $name = is_array($entry) ? (string) ($entry['name'] ?? '') : '';

            if ($name === '' || str_contains($name, "\0") || ! str_starts_with($name, 'uploads/')) {
                $archive->close();
                throw new RuntimeException('The media archive contains an unexpected path.');
            }

            $relativePath = substr($name, strlen('uploads/'));
            $segments = explode('/', str_replace('\\', '/', $relativePath));

            if ($relativePath === '' || str_starts_with($relativePath, '/')
                || in_array('..', $segments, true) || in_array('.', $segments, true)) {
                $archive->close();
                throw new RuntimeException('The media archive contains an unsafe path.');
            }

            if (str_ends_with($name, '/')) {
                continue;
            }

            $size = (int) ($entry['size'] ?? 0);
            $totalBytes += $size;

            if ($totalBytes > self::MAX_MEDIA_ARCHIVE_BYTES) {
                $archive->close();
                throw new RuntimeException('The media archive exceeds the restore size limit.');
            }

            $externalAttributes = 0;

            if ($archive->getExternalAttributesIndex($index, $system, $externalAttributes)
                && $system === ZipArchive::OPSYS_UNIX && (($externalAttributes >> 16) & 0170000) === 0120000) {
                $archive->close();
                throw new RuntimeException('The media archive contains a symbolic link.');
            }

            $entries[] = ['index' => $index, 'relative_path' => $relativePath, 'size' => $size];
        }

        $stagingRoot = $this->temporaryPrivatePath('.restore-stage-'.bin2hex(random_bytes(16)));

        if (! mkdir($stagingRoot, 0700, true)) {
            $archive->close();
            throw new RuntimeException('Private restore staging storage is unavailable.');
        }

        try {
            foreach ($entries as $entry) {
                $destination = $stagingRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $entry['relative_path']);
                $parent = dirname($destination);

                if (! is_dir($parent) && ! mkdir($parent, 0700, true) && ! is_dir($parent)) {
                    throw new RuntimeException('A media file could not be staged privately.');
                }

                $sourceStream = $archive->getStream((string) $archive->getNameIndex($entry['index']));
                $destinationStream = fopen($destination, 'x+b');

                if ($sourceStream === false || $destinationStream === false) {
                    if (is_resource($sourceStream)) {
                        fclose($sourceStream);
                    }

                    throw new RuntimeException('A media file could not be staged privately.');
                }

                try {
                    $copiedBytes = stream_copy_to_stream($sourceStream, $destinationStream);
                } finally {
                    fclose($sourceStream);
                    fclose($destinationStream);
                }

                if ($copiedBytes !== $entry['size']) {
                    throw new RuntimeException('A media archive entry failed its size check.');
                }
            }
        } catch (Throwable $exception) {
            $archive->close();
            $this->removeDirectory($stagingRoot);
            throw $exception;
        }

        $archive->close();

        return $stagingRoot;
    }

    private function restoreStagedMedia(string $stagingRoot, string $uploadRoot): void
    {
        if (! is_dir($uploadRoot) && ! mkdir($uploadRoot, 0750, true) && ! is_dir($uploadRoot)) {
            throw new RuntimeException('The upload storage directory could not be created.');
        }

        $realStagingRoot = realpath($stagingRoot);
        $realUploadRoot = realpath($uploadRoot);

        if ($realStagingRoot === false || $realUploadRoot === false) {
            throw new RuntimeException('The media restore paths could not be verified.');
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($realStagingRoot, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($iterator as $entry) {
            if ($entry->isLink()) {
                throw new RuntimeException('The staged media contains a symbolic link.');
            }

            $relativePath = substr($entry->getPathname(), strlen($realStagingRoot) + 1);
            $targetPath = $realUploadRoot.DIRECTORY_SEPARATOR.$relativePath;

            if ($entry->isDir()) {
                if (! is_dir($targetPath) && ! mkdir($targetPath, 0750, true) && ! is_dir($targetPath)) {
                    throw new RuntimeException('A media directory could not be restored.');
                }

                continue;
            }

            if (file_exists($targetPath)) {
                throw new RuntimeException('Media restore stopped because a target file already exists.');
            }

            $targetDirectory = dirname($targetPath);

            if (! is_dir($targetDirectory) && ! mkdir($targetDirectory, 0750, true) && ! is_dir($targetDirectory)) {
                throw new RuntimeException('A media directory could not be restored.');
            }

            if (! rename($entry->getPathname(), $targetPath)) {
                throw new RuntimeException('A media file could not be restored.');
            }
        }
    }

    private function restoreDatabaseDump(string $path, Connection $connection): void
    {
        if ($connection->getDriverName() !== 'mysql') {
            throw new RuntimeException('Database restore is supported only for MySQL connections.');
        }

        try {
            foreach ($this->databaseStatements($path) as $statement) {
                $connection->unprepared($statement);
            }
        } catch (Throwable $exception) {
            throw new RuntimeException('Database restore stopped. The empty target may now contain a partial schema.', previous: $exception);
        } finally {
            try {
                $connection->statement('SET FOREIGN_KEY_CHECKS=1');
            } catch (Throwable) {
                // The failed restore will be reported without exposing the database error details.
            }
        }
    }

    private function copyZipEntryToFile(ZipArchive $archive, string $entryName, string $path): void
    {
        $input = $archive->getStream($entryName);
        $output = fopen($path, 'x+b');

        if ($input === false || $output === false) {
            if (is_resource($input)) {
                fclose($input);
            }

            if (is_resource($output)) {
                fclose($output);
                @unlink($path);
            }

            throw new RuntimeException('A full backup component could not be staged.');
        }

        try {
            if (stream_copy_to_stream($input, $output) === false) {
                throw new RuntimeException('A full backup component could not be staged.');
            }
        } finally {
            fclose($input);
            fclose($output);
        }
    }

    private function temporaryPrivatePath(string $filename): string
    {
        $root = app(DatabaseBackupService::class)->privateBackupDirectory();

        return $root.DIRECTORY_SEPARATOR.$filename;
    }

    private function removeDirectory(string $path): void
    {
        if (! is_dir($path) || is_link($path)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );

        foreach ($iterator as $entry) {
            $entry->isDir() && ! $entry->isLink() ? @rmdir($entry->getPathname()) : @unlink($entry->getPathname());
        }

        @rmdir($path);
    }
}
