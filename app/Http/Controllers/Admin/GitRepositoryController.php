<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RollbackMigrationRequest;
use App\Http\Requests\Admin\UpdateGitRepositorySettingsRequest;
use App\Services\DatabaseMigrationService;
use App\Services\GitRepositoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class GitRepositoryController extends Controller
{
    public function index(
        GitRepositoryService $repository,
        DatabaseMigrationService $databaseMigration,
    ): Response {
        return Inertia::render('Admin/GitRepository', [
            'repository' => $repository->snapshot(),
            'settings' => $repository->settingsForPage(),
            'history' => $repository->historyForPage(),
            'database' => $databaseMigration->status(),
        ]);
    }

    public function updateSettings(UpdateGitRepositorySettingsRequest $request, GitRepositoryService $repository): RedirectResponse
    {
        try {
            $settings = $request->validated();
            $settings['credential'] = $settings['credential'] ?? null;
            $repository->saveSettings($settings);

            try {
                activity('system_repository')
                    ->causedBy($request->user())
                    ->event('settings.updated')
                    ->withProperties(['branch' => $settings['branch'], 'enabled' => $settings['enabled']])
                    ->log('Updated Git repository settings');
            } catch (Throwable) {
                // Activity logging failure should not block setting updates
            }

            return back()->with('success', 'Git Repository settings saved in private application storage.');
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }

    public function check(GitRepositoryService $repository): RedirectResponse
    {
        try {
            $status = $repository->check();

            return back()->with('success', $status['message']);
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }

    public function reconnectSourceCheckout(GitRepositoryService $repository): RedirectResponse
    {
        try {
            $repository->reconnectSourceCheckout();

            return back()->with('success', 'The private application-managed Git checkout is ready. Check GitHub to verify the repository status.');
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }

    public function initializeCheckout(Request $request, GitRepositoryService $repository): RedirectResponse
    {
        try {
            $repository->initializeOrRepairManagedCheckout();

            try {
                activity('system_repository')
                    ->causedBy($request->user())
                    ->event('checkout.initialized')
                    ->log('Initialized private application-managed Git repository');
            } catch (Throwable) {
                // Activity logging failure should not block operation
            }

            return back()->with('success', 'Private application-managed Git checkout initialized and connected successfully.');
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }

    public function pull(Request $request, GitRepositoryService $repository): RedirectResponse
    {
        try {
            $status = $repository->pull();

            try {
                activity('system_repository')
                    ->causedBy($request->user())
                    ->event('deployment.completed')
                    ->withProperties(['commit' => $status['local_commit'] ?? null])
                    ->log('Applied fast-forward deployment update');
            } catch (Throwable) {
                // Ignore activity log failure
            }

            return back()->with('success', $status['message']);
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }
    }

    public function runMigrations(Request $request, DatabaseMigrationService $databaseMigration): RedirectResponse
    {
        $result = $databaseMigration->migrate();

        try {
            activity('system_database')
                ->causedBy($request->user())
                ->event('migrations.run')
                ->withProperties(['success' => $result['success']])
                ->log('Ran database migrations via web interface');
        } catch (Throwable) {
            // Ignore activity log failure
        }

        if ($result['success']) {
            return redirect()->route('admin.git_repository.index')->with('success', 'Database migrations executed: '.($result['output'] ?: 'Database is up to date.'));
        }

        return redirect()->route('admin.git_repository.index')->with('error', 'Database migration stopped: '.$result['output']);
    }

    public function rollbackMigrations(RollbackMigrationRequest $request, DatabaseMigrationService $databaseMigration): RedirectResponse
    {
        $step = (int) ($request->validated('step') ?? 1);
        $result = $databaseMigration->rollback($step);

        try {
            activity('system_database')
                ->causedBy($request->user())
                ->event('migrations.rollback')
                ->withProperties(['step' => $step, 'success' => $result['success']])
                ->log("Rolled back {$step} migration step(s)");
        } catch (Throwable) {
            // Ignore activity log failure
        }

        if ($result['success']) {
            return redirect()->route('admin.git_repository.index')->with('success', 'Database rollback executed: '.($result['output'] ?: 'No migrations to roll back.'));
        }

        return redirect()->route('admin.git_repository.index')->with('error', 'Database rollback failed: '.$result['output']);
    }

    public function remigrateMigrations(RollbackMigrationRequest $request, DatabaseMigrationService $databaseMigration): RedirectResponse
    {
        $step = (int) ($request->validated('step') ?? 1);
        $result = $databaseMigration->remigrate($step);

        try {
            activity('system_database')
                ->causedBy($request->user())
                ->event('migrations.remigrate')
                ->withProperties(['step' => $step, 'success' => $result['success']])
                ->log("Re-migrated {$step} migration step(s)");
        } catch (Throwable) {
            // Ignore activity log failure
        }

        if ($result['success']) {
            return redirect()->route('admin.git_repository.index')->with('success', 'Database re-migration finished successfully.');
        }

        return redirect()->route('admin.git_repository.index')->with('error', 'Database re-migration failed: '.$result['output']);
    }

    public function clearCaches(Request $request, DatabaseMigrationService $databaseMigration): RedirectResponse
    {
        $result = $databaseMigration->clearCaches();

        try {
            activity('system_database')
                ->causedBy($request->user())
                ->event('cache.cleared')
                ->log('Cleared compiled caches from system manager');
        } catch (Throwable) {
            // Ignore activity log failure
        }

        if ($result['success']) {
            return redirect()->route('admin.git_repository.index')->with('success', 'Compiled application and database caches cleared.');
        }

        return redirect()->route('admin.git_repository.index')->with('error', 'Cache clear failed: '.$result['output']);
    }

    public function rebuildCaches(Request $request, DatabaseMigrationService $databaseMigration): RedirectResponse
    {
        $result = $databaseMigration->rebuildCaches();

        try {
            activity('system_database')
                ->causedBy($request->user())
                ->event('cache.rebuilt')
                ->log('Rebuilt compiled caches from system manager');
        } catch (Throwable) {
            // Ignore activity log failure
        }

        if ($result['success']) {
            return redirect()->route('admin.git_repository.index')->with('success', 'Application caches rebuilt successfully.');
        }

        return redirect()->route('admin.git_repository.index')->with('error', 'Cache rebuild failed: '.$result['output']);
    }
}
