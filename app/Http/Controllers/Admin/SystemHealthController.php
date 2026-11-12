<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ClearSystemHealthCachesRequest;
use App\Http\Requests\Admin\CreateSystemBackupRequest;
use App\Http\Requests\Admin\DeleteSystemBackupRequest;
use App\Http\Requests\Admin\ResetSystemDataRequest;
use App\Http\Requests\Admin\RestoreSystemBackupRequest;
use App\Http\Requests\Admin\UpdateSystemHealthBackupScheduleRequest;
use App\Services\DatabaseBackupService;
use App\Services\SystemBackupRestoreService;
use App\Services\SystemDataResetService;
use App\Services\SystemHealthBackupScheduleService;
use App\Services\SystemHealthSnapshotService;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class SystemHealthController extends Controller
{
    public function index(
        SystemHealthSnapshotService $healthService,
        DatabaseBackupService $backupService,
    ): InertiaResponse {
        $health = $healthService->snapshot();
        $isSuperAdmin = request()->user()?->hasRole('Super Admin') ?? false;
        $restoreTarget = $isSuperAdmin
            ? ($health['database']['name'] ?? null)
            : null;
        unset($health['database']['name']);

        $backupCapabilities = $backupService->capabilities();
        $backups = $backupService->history();

        if (! $isSuperAdmin) {
            $backupCapabilities['cpanel'] = false;
            $backups = array_values(array_filter(
                $backups,
                static fn (array $backup): bool => $backup['type'] !== 'cpanel',
            ));
        }

        return Inertia::render('Admin/SystemHealth', [
            'health' => $health,
            'backups' => $backups,
            'backupCapabilities' => $backupCapabilities,
            'restoreTarget' => $restoreTarget,
            'csrfToken' => csrf_token(),
        ]);
    }

    public function backup(
        CreateSystemBackupRequest $request,
        DatabaseBackupService $backupService,
    ): RedirectResponse|BinaryFileResponse {
        try {
            $backupPath = $backupService->create($request->validated('backup_type'));
        } catch (Throwable $exception) {
            $failureReason = $this->safeBackupFailureReason($exception);
            Log::error('System backup creation failed.', [
                'exception_class' => $exception::class,
                'safe_reason' => $failureReason,
                'database_sql_state' => $exception instanceof QueryException ? ($exception->errorInfo[0] ?? null) : null,
                'database_error_code' => $exception instanceof QueryException
                    ? $this->databaseErrorCode($exception)
                    : null,
            ]);

            return back()->with('error', "The backup was not created. {$failureReason}");
        }

        try {
            $backupService->pruneExpiredBackups();
        } catch (Throwable $exception) {
            Log::warning('Expired system backup cleanup failed.', ['exception_class' => $exception::class]);
        }

        try {
            activity('system_health')
                ->causedBy($request->user())
                ->event('backup.created')
                ->withProperties(['type' => $request->validated('backup_type')])
                ->log('Created a system backup');
        } catch (Throwable $exception) {
            report($exception);
        }

        if ($request->boolean('download_after_create')) {
            try {
                activity('system_health')
                    ->causedBy($request->user())
                    ->event('backup.downloaded')
                    ->withProperties(['type' => $request->validated('backup_type')])
                    ->log('Downloaded a newly created system backup');
            } catch (Throwable $exception) {
                report($exception);
            }

            return response()->download($backupPath, basename($backupPath), [
                'Cache-Control' => 'private, no-store, max-age=0',
                'Pragma' => 'no-cache',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        return back()->with('success', 'The backup was created in private storage.');
    }

    public function updateBackupSchedule(
        UpdateSystemHealthBackupScheduleRequest $request,
        SystemHealthBackupScheduleService $scheduleService,
    ): RedirectResponse {
        $validated = $request->validated();
        $enabled = $request->boolean('enabled');
        $time = $validated['backup_time'];

        try {
            $scheduleService->save($enabled, $time);
        } catch (Throwable $exception) {
            Log::error('System backup schedule update failed.', ['exception_class' => $exception::class]);

            return back()->with('error', 'The automatic backup schedule could not be saved.');
        }

        try {
            activity('system_health')
                ->causedBy($request->user())
                ->event('backup.schedule_updated')
                ->withProperties(['enabled' => $enabled, 'time' => $time])
                ->log('Updated the automatic backup schedule');
        } catch (Throwable $exception) {
            report($exception);
        }

        return back()->with('success', $enabled
            ? "Automatic full backups are scheduled daily at {$time} ({$scheduleService->settings()['timezone']})."
            : 'Automatic full backups are disabled. Manual backups remain available.');
    }

    public function download(Request $request, string $filename, DatabaseBackupService $backupService): BinaryFileResponse
    {
        abort_if($backupService->backupTypeForFilename($filename) === 'cpanel' && ! $request->user()?->hasRole('Super Admin'), 403);

        $path = $backupService->pathForDownload($filename);

        abort_unless($path !== null, 404);

        try {
            activity('system_health')
                ->causedBy($request->user())
                ->event('backup.downloaded')
                ->withProperties(['type' => explode('-', $filename, 2)[0]])
                ->log('Downloaded a system backup');
        } catch (Throwable $exception) {
            report($exception);
        }

        return response()->download($path, $filename, [
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function destroyBackup(
        DeleteSystemBackupRequest $request,
        string $filename,
        DatabaseBackupService $backupService,
    ): RedirectResponse {
        $filename = $request->validated('filename');

        if (! $backupService->deleteBackup($filename)) {
            return back()->with('error', 'The selected backup was not found or could not be deleted.');
        }

        try {
            activity('system_health')
                ->causedBy($request->user())
                ->event('backup.deleted')
                ->withProperties(['type' => explode('-', $filename, 2)[0]])
                ->log('Permanently deleted a system backup');
        } catch (Throwable $exception) {
            report($exception);
        }

        return back()->with('success', 'The backup was permanently deleted.');
    }

    public function restore(
        RestoreSystemBackupRequest $request,
        SystemBackupRestoreService $restoreService,
    ): RedirectResponse {
        $type = $request->validated('restore_type');
        $mode = $request->restoreMode();

        try {
            if ($request->hasFile('backup_file')) {
                $restoreService->restoreUploaded(
                    $request->file('backup_file'),
                    $type,
                    $request->validated('target_database'),
                    $mode,
                );
            } else {
                $restoreService->restore(
                    $request->validated('backup_filename'),
                    $type,
                    $request->validated('target_database'),
                    $mode,
                );
            }
        } catch (Throwable $exception) {
            $failureReason = $this->safeRestoreFailureReason($exception);
            Log::error('System backup restore failed.', [
                'exception_class' => $exception::class,
                'safe_reason' => $failureReason,
                'database_sql_state' => $exception instanceof QueryException ? ($exception->errorInfo[0] ?? null) : null,
                'database_error_code' => $exception instanceof QueryException
                    ? $this->databaseErrorCode($exception)
                    : null,
            ]);

            return back()->with('error', "Restore stopped. {$failureReason}");
        }

        try {
            activity('system_health')
                ->causedBy($request->user())
                ->event('backup.restored')
                ->withProperties([
                    'type' => $type,
                    'mode' => $mode,
                    'source' => $request->hasFile('backup_file') ? 'upload' : 'saved',
                ])
                ->log($mode === 'overwrite'
                    ? 'Restored a system backup by overwriting an existing target'
                    : 'Restored a system backup to an empty target');
        } catch (Throwable $exception) {
            report($exception);
        }

        return back()->with('success', $mode === 'overwrite'
            ? 'The backup replaced the selected target. A recovery backup was created first.'
            : 'The backup was restored to the empty target.');
    }

    public function clearCaches(ClearSystemHealthCachesRequest $request): RedirectResponse
    {
        try {
            foreach (['config:clear', 'route:clear', 'event:clear', 'view:clear'] as $command) {
                if (Artisan::call($command) !== 0) {
                    return back()->with('error', 'A compiled cache could not be cleared completely. Review the application logs.');
                }
            }
        } catch (Throwable $exception) {
            Log::error('System health cache maintenance failed.', ['exception_class' => $exception::class]);

            return back()->with('error', 'Compiled cache maintenance failed. Review the application logs.');
        }

        try {
            activity('system_health')
                ->causedBy($request->user())
                ->event('application_cache.cleared')
                ->log('Cleared compiled application caches');
        } catch (Throwable $exception) {
            report($exception);
        }

        return back()->with('success', 'Compiled application caches were cleared.');
    }

    public function resetAsNew(
        ResetSystemDataRequest $request,
        SystemDataResetService $resetService,
    ): RedirectResponse {
        try {
            $resetService->reset();
        } catch (Throwable $exception) {
            Log::error('Application data reset failed.', [
                'exception_class' => $exception::class,
            ]);

            return back()->with('error', 'Reset stopped. Some data or uploads may already have been permanently removed; review the application logs before retrying.');
        }

        try {
            activity('system_health')
                ->causedBy($request->user())
                ->event('application.reset_as_new')
                ->log('Reset application data and uploads as new');
        } catch (Throwable $exception) {
            report($exception);
        }

        return back()->with('success', 'Application data and uploads were permanently reset. Administrator access, clinic configuration, and saved backups were kept.');
    }

    private function safeBackupFailureReason(Throwable $exception): string
    {
        if ($exception instanceof QueryException) {
            return match ($this->databaseErrorCode($exception)) {
                1044, 1045, 1142, 1143, 1227 => 'MySQL denied a required database or metadata permission. Ask the database administrator to review the backup account privileges.',
                1054, 1109, 1146 => 'The database schema did not match the structure required for a backup. Review the schema before retrying.',
                1205, 1213 => 'MySQL could not provide a stable backup snapshot because of a lock timeout or deadlock. Retry during a quieter period.',
                2002, 2003, 2006, 2013, 2055 => 'The MySQL connection was interrupted during backup. Check server availability before retrying.',
                default => sprintf(
                    'A MySQL read or schema-check failed (error code %d). SQL and data values were redacted; review the server logs before retrying.',
                    $this->databaseErrorCode($exception),
                ),
            };
        }

        if (! $exception instanceof \RuntimeException) {
            return 'A database or private-storage operation failed. Detailed exception data was redacted.';
        }

        $message = $exception->getMessage();
        $safeMessages = [
            'The requested backup type is not supported.',
            'Media, full, and cPanel application packages require the PHP Zip extension.',
            'Database backups are supported only for MySQL connections.',
            'Private backup storage is unavailable.',
            'Could not verify the private backup location.',
            'The configured backup path is publicly accessible.',
            'Could not create the private backup file.',
            'Could not open the private backup file.',
            'The database backup could not be finalized.',
            'The media backup archive could not be finalized.',
            'Could not create the media backup archive.',
            'Could not create the full backup archive.',
            'Could not add all components to the full backup archive.',
            'The full backup archive could not be finalized.',
            'Could not create the cPanel application package.',
            'The cPanel application package could not be finalized.',
            'The application directory could not be verified.',
            'A deployment directory could not be verified.',
            'A deployment file could not be added to the cPanel application package.',
            'A deployment file could not be optimized in the cPanel application package.',
            'A deployment directory marker could not be added to the cPanel application package.',
            'The media storage directory could not be verified.',
            'A media file could not be added to the backup archive.',
            'The database backup could not be written.',
            'A database table definition could not be verified.',
            'A database table definition could not be read.',
            'A database value could not be safely encoded in the backup.',
            'Database backup stopped because a table does not use InnoDB.',
            'Database backup stopped because this database contains views.',
            'Database backup stopped because this database contains views or triggers.',
            'Could not restrict access to the private backup file.',
        ];

        foreach (['TRIGGERS', 'ROUTINES', 'EVENTS'] as $objectType) {
            $safeMessages[] = "Database backup stopped because this database contains {$objectType}.";
        }

        return in_array($message, $safeMessages, true)
            ? $message
            : 'A database or private-storage operation failed. Detailed exception data was redacted.';
    }

    private function safeRestoreFailureReason(Throwable $exception): string
    {
        if ($exception instanceof QueryException) {
            return match ($this->databaseErrorCode($exception)) {
                1044, 1045, 1142, 1143, 1227 => 'MySQL denied access to the restore target. Verify the target database and account privileges.',
                1049, 1146 => 'The restore target database does not exist on the configured MySQL server. Create the empty target first.',
                1054, 1109 => 'The restore target schema is incompatible with this operation. Verify the target before retrying.',
                1205, 1213 => 'MySQL could not lock the restore target safely. Retry when no other database operation is running.',
                2002, 2003, 2006, 2013, 2055 => 'The MySQL connection was interrupted while restoring. Verify server availability before retrying.',
                default => sprintf(
                    'A MySQL restore check failed (error code %d). SQL and data values were redacted; review the server logs before retrying.',
                    $this->databaseErrorCode($exception),
                ),
            };
        }

        if (! $exception instanceof \RuntimeException) {
            return 'A database or private-storage operation failed. Detailed exception data was redacted.';
        }

        $safeMessages = [
            'The selected backup is not available for restoration.',
            'The selected backup type is not supported.',
            'The uploaded backup file is empty or exceeds the 2 GB upload limit.',
            'The uploaded backup file extension does not match the selected backup type.',
            'The uploaded backup could not be protected in private storage.',
            'The uploaded backup is not a readable ZIP archive.',
            'The uploaded full backup has an unexpected archive structure.',
            'The uploaded backup was not created by this application.',
            'The database backup contains a statement that is not allowed for restore.',
            'The database backup does not contain a restorable schema.',
            'The database backup is not a readable compressed SQL file.',
            'The compressed database backup is incomplete or damaged.',
            'The database backup was not created by this application.',
            'Database restore is supported only for MySQL connections.',
            'The database backup expands beyond the 8 GB safety limit.',
            'The restore target must be an existing database on the configured MySQL server.',
            'The configured MySQL connection could not be used for the restore target.',
            'The configured MySQL connection did not select the requested restore target.',
            'Database restore is allowed only when the selected database has no tables or views.',
            'The PHP Zip extension is required to restore media backups.',
            'Media restore is allowed only when upload storage contains no files.',
            'Media restore stopped because upload storage is a symbolic link.',
            'Media restore stopped because upload storage contains a symbolic link.',
            'The full backup archive could not be opened.',
            'The full backup archive has an unexpected structure.',
            'The media backup archive could not be opened.',
            'The media archive contains an unexpected path.',
            'The media archive contains an unsafe path.',
            'The media archive contains a symbolic link.',
            'The media archive exceeds the restore size limit.',
            'Private restore staging storage is unavailable.',
            'A media file could not be staged privately.',
            'A media archive entry failed its size check.',
            'A full backup component could not be staged.',
            'The staged media contains a symbolic link.',
            'The upload storage directory could not be created.',
            'The media restore paths could not be verified.',
            'A media directory could not be restored.',
            'Media restore stopped because a target file already exists.',
            'A media file could not be restored.',
            'Database restore stopped. The empty target may now contain a partial schema.',
            'Private backup storage is unavailable.',
            'Could not verify the private backup location.',
            'The configured backup path is publicly accessible.',
            'The configured backup path must be absolute.',
            'The selected restore mode is not supported.',
            'A recovery backup could not be created. The overwrite did not start.',
            'The selected database could not be cleared. The recovery backup is available for rollback.',
            'The upload storage could not be cleared. The recovery backup is available for rollback.',
        ];

        return in_array($exception->getMessage(), $safeMessages, true)
            ? $exception->getMessage()
            : 'A database or private-storage operation failed. Detailed exception data was redacted.';
    }

    private function databaseErrorCode(QueryException $exception): int
    {
        return is_numeric($exception->errorInfo[1] ?? null)
            ? (int) $exception->errorInfo[1]
            : 0;
    }
}
