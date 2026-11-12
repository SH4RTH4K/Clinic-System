<?php

namespace App\Services;

use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class SystemDataResetService
{
    /**
     * Tables containing application data that may be permanently removed by a reset.
     *
     * Authentication, authorization, clinic configuration, migrations, and sessions
     * are deliberately excluded so the Super Admin retains access afterwards.
     *
     * @var list<string>
     */
    private const RESET_TABLES = [
        'activity_log',
        'advice_items',
        'appointment_request_events',
        'appointment_requests',
        'cache',
        'cache_locks',
        'doctors',
        'failed_jobs',
        'food_restrictions',
        'job_batches',
        'jobs',
        'medicines',
        'password_reset_tokens',
        'patient_numbering_sequences',
        'patients',
        'prescription_items',
        'symptom_medicine_map_versions',
        'symptom_medicine_map',
        'symptoms',
        'visit_advice',
        'visit_amendments',
        'visit_drafts',
        'visit_food_restriction',
        'visit_symptom',
        'visits',
    ];

    /**
     * Permanently remove application data and uploaded files without creating a recovery backup.
     */
    public function reset(): void
    {
        $connection = DB::connection();

        $this->assertUploadStorageCanBeCleared();
        $this->clearApplicationData($connection);
        $this->clearUploadStorage();
    }

    private function clearApplicationData(Connection $connection): void
    {
        $schema = $connection->getSchemaBuilder();

        try {
            $schema->withoutForeignKeyConstraints(function () use ($connection, $schema): void {
                foreach (self::RESET_TABLES as $table) {
                    if ($schema->hasTable($table)) {
                        $connection->table($table)->truncate();
                    }
                }
            });
        } catch (Throwable $exception) {
            throw new RuntimeException('The application database could not be reset.', previous: $exception);
        }
    }

    private function assertUploadStorageCanBeCleared(): void
    {
        $uploadRoot = rtrim(Storage::disk('public')->path(''), DIRECTORY_SEPARATOR);

        if (is_link($uploadRoot)) {
            throw new RuntimeException('Upload storage is a symbolic link and cannot be reset safely.');
        }

        if (! is_dir($uploadRoot)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($uploadRoot, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($iterator as $entry) {
            if ($entry->isLink()) {
                throw new RuntimeException('Upload storage contains a symbolic link and cannot be reset safely.');
            }
        }
    }

    private function clearUploadStorage(): void
    {
        $uploadRoot = Storage::disk('public')->path('');

        if (! is_dir($uploadRoot)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($uploadRoot, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );

        foreach ($iterator as $entry) {
            $relativePath = str_replace('\\', '/', ltrim(
                substr($entry->getPathname(), strlen($uploadRoot)),
                DIRECTORY_SEPARATOR,
            ));

            if (in_array($relativePath, ['.htaccess', '.keep'], true)) {
                continue;
            }

            $removed = $entry->isDir() ? @rmdir($entry->getPathname()) : @unlink($entry->getPathname());

            if (! $removed) {
                throw new RuntimeException('Upload storage could not be fully reset.');
            }
        }
    }
}
