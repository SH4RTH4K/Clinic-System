<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GitRepositoryService;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class GitRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_from_git_repository_page(): void
    {
        $this->get(route('admin.git_repository.index'))
            ->assertRedirect(route('login'));
    }

    public function test_non_super_admin_cannot_view_or_operate_git_repository(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Doctor', 'web'));

        $this->actingAs($user)
            ->get(route('admin.git_repository.index'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('admin.git_repository.check'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('admin.git_repository.reconnect_source'))
            ->assertForbidden();
    }

    public function test_super_admin_can_view_repository_status_but_git_actions_are_disabled_in_testing(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.git_repository.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/GitRepository')
                ->where('repository.enabled', false)
                ->where('repository.environment', 'testing')
                ->where('repository.status', 'Disabled')
                ->where('repository.pull_available', false)
                ->where('settings.can_configure', false)
                ->where('settings.configuration_message', 'Settings and Git actions are disabled in the automated testing environment.')
                ->where('settings.branch', 'hardening')
                ->where('settings.run_migrations', false)
                ->where('settings.clear_cache', true)
                ->where('settings.health_check', true)
                ->has('history', 0));
    }

    public function test_repository_check_is_rejected_in_automated_tests_without_running_git(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.check'))
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('error', 'Git settings and actions are disabled in the automated testing environment.');
    }

    public function test_git_connection_failure_shows_safe_actionable_diagnostic_without_raw_process_output(): void
    {
        $service = app(GitRepositoryService::class);
        $method = new \ReflectionMethod($service, 'gitFailureMessage');

        $message = $method->invoke($service, ['fetch'], [
            'code' => 128,
            'output' => '',
            'error' => "fatal: unable to access 'https://github.com/owner/repository.git': Could not resolve host: github.com; token=test-secret; /home/clinic/private",
        ]);

        $this->assertSame(
            'GitHub connection check failed. The server could not reach GitHub. Check outbound HTTPS and DNS access on this host.',
            $message,
        );
        $this->assertStringNotContainsString('test-secret', $message);
        $this->assertStringNotContainsString('/home/clinic/private', $message);
    }

    public function test_missing_remote_branch_has_a_specific_safe_git_diagnostic(): void
    {
        $service = app(GitRepositoryService::class);
        $method = new \ReflectionMethod($service, 'gitFailureMessage');

        $message = $method->invoke($service, ['fetch'], [
            'code' => 128,
            'output' => '',
            'error' => "fatal: couldn't find remote ref refs/heads/missing-branch",
        ]);

        $this->assertSame(
            'GitHub connection check failed. The configured branch was not found on GitHub. Verify the branch name.',
            $message,
        );
    }

    public function test_git_checkout_failure_explains_that_valid_git_metadata_is_required(): void
    {
        $service = app(GitRepositoryService::class);
        $method = new \ReflectionMethod($service, 'gitFailureMessage');

        $message = $method->invoke($service, ['rev-parse', '--show-toplevel'], [
            'code' => 128,
            'output' => '',
            'error' => 'fatal: not a git repository (or any of the parent directories): .git',
        ]);

        $this->assertSame(
            'Git checkout check failed. The private source directory is not a readable Git checkout. Save the settings again to initialize or reconnect it.',
            $message,
        );
    }

    public function test_repository_settings_cannot_be_saved_from_automated_testing_environment(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.settings'), $this->settingsPayload())
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('error', 'Git settings and actions are disabled in the automated testing environment.');

        Storage::disk('local')->assertMissing('system/git-repository/settings.json');
    }

    public function test_super_admin_can_save_repository_settings_in_local_environment(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'local');
        Storage::fake('local');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->withoutMiddleware(PreventRequestForgery::class)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.settings'), $this->settingsPayload())
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('success', 'Git Repository settings saved in private application storage.');

        Storage::disk('local')->assertExists('system/git-repository/settings.json');
    }

    public function test_registered_cpanel_checkout_compares_the_deployed_commit_with_the_remote(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'local');
        Storage::fake('local');

        $originalBasePath = base_path();
        $accountRoot = sys_get_temp_dir().DIRECTORY_SEPARATOR.'clinic-git-'.bin2hex(random_bytes(8));
        $privatePath = $accountRoot.DIRECTORY_SEPARATOR.'private';
        $sourcePath = $accountRoot.DIRECTORY_SEPARATOR.'repositories'.DIRECTORY_SEPARATOR.'clinic';

        File::ensureDirectoryExists($privatePath);
        File::ensureDirectoryExists($sourcePath);

        try {
            $this->fixtureGit($sourcePath, ['init', '--quiet', '--initial-branch=hardening']);
            File::ensureDirectoryExists($sourcePath.DIRECTORY_SEPARATOR.'deploy'.DIRECTORY_SEPARATOR.'cpanel');
            File::ensureDirectoryExists($sourcePath.DIRECTORY_SEPARATOR.'resources'.DIRECTORY_SEPARATOR.'js');
            file_put_contents($sourcePath.DIRECTORY_SEPARATOR.'deploy'.DIRECTORY_SEPARATOR.'cpanel'.DIRECTORY_SEPARATOR.'update-live.sh', 'synthetic updater');
            file_put_contents($sourcePath.DIRECTORY_SEPARATOR.'deploy'.DIRECTORY_SEPARATOR.'cpanel'.DIRECTORY_SEPARATOR.'build-release.sh', 'synthetic builder');
            file_put_contents($sourcePath.DIRECTORY_SEPARATOR.'package-lock.json', '{}');
            $frontendPath = $sourcePath.DIRECTORY_SEPARATOR.'resources'.DIRECTORY_SEPARATOR.'js'.DIRECTORY_SEPARATOR.'Dashboard.jsx';
            file_put_contents($frontendPath, 'first');
            $this->fixtureGit($sourcePath, ['add', 'deploy/cpanel/update-live.sh', 'deploy/cpanel/build-release.sh', 'package-lock.json', 'resources/js/Dashboard.jsx']);
            $this->fixtureGit($sourcePath, ['-c', 'user.name=Clinic Test', '-c', 'user.email=test@local.invalid', 'commit', '--quiet', '-m', 'first']);
            $deployedCommit = $this->fixtureGit($sourcePath, ['rev-parse', 'HEAD']);

            file_put_contents($frontendPath, 'second');
            $this->fixtureGit($sourcePath, ['add', 'resources/js/Dashboard.jsx']);
            $this->fixtureGit($sourcePath, ['-c', 'user.name=Clinic Test', '-c', 'user.email=test@local.invalid', 'commit', '--quiet', '-m', 'second']);
            $sourceCommit = $this->fixtureGit($sourcePath, ['rev-parse', 'HEAD']);
            $this->fixtureGit($sourcePath, ['remote', 'add', 'origin', 'https://github.com/SH4RTH4K/Clinic-System.git']);
            $this->fixtureGit($sourcePath, ['update-ref', 'refs/remotes/origin/hardening', $sourceCommit]);

            file_put_contents($privatePath.DIRECTORY_SEPARATOR.'DEPLOYED_GIT_REPOSITORY', $sourcePath.PHP_EOL);
            file_put_contents($privatePath.DIRECTORY_SEPARATOR.'DEPLOYED_COMMIT', $deployedCommit.PHP_EOL);

            $this->app->setBasePath($privatePath);
            $service = app(GitRepositoryService::class);
            $service->saveSettings($this->settingsPayload(['enabled' => true, 'health_check' => false]));
            $snapshot = $service->snapshot();

            Storage::disk('local')->assertExists('system/git-repository/settings.json');
            $this->assertSame('Update available', $snapshot['status']);
            $this->assertSame($deployedCommit, $snapshot['local_commit']);
            $this->assertSame($sourceCommit, $snapshot['source_commit']);
            $this->assertSame($sourceCommit, $snapshot['remote_commit']);
            $this->assertSame(1, $snapshot['incoming_commits']);
            $this->assertTrue($snapshot['deploy_available']);

            file_put_contents($privatePath.DIRECTORY_SEPARATOR.'DEPLOYED_COMMIT', $sourceCommit.PHP_EOL);
            $currentSnapshot = $service->snapshot();
            $this->assertSame('Up to date', $currentSnapshot['status']);
            $this->assertSame(0, $currentSnapshot['incoming_commits']);
        } finally {
            $this->app->setBasePath($originalBasePath);
            File::deleteDirectory($accountRoot);
        }
    }

    public function test_super_admin_can_reconnect_a_stale_cpanel_registration_to_the_unique_matching_checkout(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'local');
        Storage::fake('local');

        $originalBasePath = base_path();
        $accountRoot = sys_get_temp_dir().DIRECTORY_SEPARATOR.'clinic-git-reconnect-'.bin2hex(random_bytes(8));
        $privatePath = $accountRoot.DIRECTORY_SEPARATOR.'private';
        $sourcePath = $accountRoot.DIRECTORY_SEPARATOR.'repositories'.DIRECTORY_SEPARATOR.'Clinic-Systemrepositories'.DIRECTORY_SEPARATOR.'Clinic-System-release';
        $registrationPath = $privatePath.DIRECTORY_SEPARATOR.'DEPLOYED_GIT_REPOSITORY';

        File::ensureDirectoryExists($privatePath);
        File::ensureDirectoryExists(dirname($sourcePath));
        File::ensureDirectoryExists($sourcePath);

        try {
            $this->fixtureGit($sourcePath, ['init', '--quiet', '--initial-branch=hardening']);
            file_put_contents($sourcePath.DIRECTORY_SEPARATOR.'README.md', 'synthetic source checkout');
            $this->fixtureGit($sourcePath, ['add', 'README.md']);
            $this->fixtureGit($sourcePath, ['-c', 'user.name=Clinic Test', '-c', 'user.email=test@local.invalid', 'commit', '--quiet', '-m', 'initial']);
            $this->fixtureGit($sourcePath, ['remote', 'add', 'origin', 'https://github.com/SH4RTH4K/Clinic-System.git']);
            $staleSourcePath = $accountRoot.DIRECTORY_SEPARATOR.'repositories'.DIRECTORY_SEPARATOR.'stale-checkout';
            File::ensureDirectoryExists($staleSourcePath.DIRECTORY_SEPARATOR.'.git');
            file_put_contents($registrationPath, $staleSourcePath.PHP_EOL);
            $this->app->setBasePath($privatePath);
            Storage::disk('local')->put('system/git-repository/settings.json', json_encode([
                'enabled' => true,
                'branch' => 'hardening',
                'remote' => 'origin',
                'repository_type' => 'public',
                'repository_url' => 'https://github.com/SH4RTH4K/Clinic-System.git',
                'authentication' => 'none',
                'credential' => null,
                'run_migrations' => false,
                'clear_cache' => true,
                'health_check' => true,
            ], JSON_THROW_ON_ERROR));

            $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
            $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

            $this->withoutVite()
                ->actingAs($user)
                ->get(route('admin.git_repository.index'))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('repository.status', 'Unavailable')
                    ->where('repository.source_reconnect_available', true));

            $this->withoutMiddleware(PreventRequestForgery::class)
                ->actingAs($user)
                ->from(route('admin.git_repository.index'))
                ->post(route('admin.git_repository.reconnect_source'))
                ->assertRedirect(route('admin.git_repository.index'))
                ->assertSessionHas('success', 'The private application-managed Git checkout is ready. Check GitHub to verify the repository status.');

            $this->assertSame(realpath($sourcePath), trim((string) file_get_contents($registrationPath)));
        } finally {
            $this->app->setBasePath($originalBasePath);
            File::deleteDirectory($accountRoot);
        }
    }

    public function test_super_admin_can_reconnect_a_stale_registration_to_the_existing_managed_checkout(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'local');

        $originalBasePath = base_path();
        $accountRoot = sys_get_temp_dir().DIRECTORY_SEPARATOR.'clinic-git-managed-reconnect-'.bin2hex(random_bytes(8));
        $privatePath = $accountRoot.DIRECTORY_SEPARATOR.'private';
        $storageRoot = $privatePath.DIRECTORY_SEPARATOR.'storage'.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'private';
        $originalStorageRoot = (string) config('filesystems.disks.local.root');

        Config::set('filesystems.disks.local.root', $storageRoot);
        Storage::forgetDisk('local');
        $managedPath = Storage::disk('local')->path('git-repository/source');
        $registrationPath = $privatePath.DIRECTORY_SEPARATOR.'DEPLOYED_GIT_REPOSITORY';

        File::ensureDirectoryExists($privatePath);
        File::ensureDirectoryExists($managedPath);

        try {
            $this->fixtureGit($managedPath, ['init', '--quiet', '--initial-branch=hardening']);
            file_put_contents($managedPath.DIRECTORY_SEPARATOR.'README.md', 'managed source checkout');
            $this->fixtureGit($managedPath, ['add', 'README.md']);
            $this->fixtureGit($managedPath, ['-c', 'user.name=Clinic Test', '-c', 'user.email=test@local.invalid', 'commit', '--quiet', '-m', 'initial']);
            $this->fixtureGit($managedPath, ['remote', 'add', 'origin', 'https://github.com/SH4RTH4K/Clinic-System.git']);
            file_put_contents($registrationPath, $accountRoot.DIRECTORY_SEPARATOR.'repositories'.DIRECTORY_SEPARATOR.'deleted-checkout'.PHP_EOL);
            $this->app->setBasePath($privatePath);
            Storage::disk('local')->put('system/git-repository/settings.json', json_encode([
                'enabled' => true,
                'branch' => 'hardening',
                'remote' => 'origin',
                'repository_type' => 'public',
                'repository_url' => 'https://github.com/SH4RTH4K/Clinic-System.git',
                'authentication' => 'none',
                'credential' => null,
                'run_migrations' => false,
                'clear_cache' => true,
                'health_check' => true,
            ], JSON_THROW_ON_ERROR));

            $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
            $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

            $this->withoutMiddleware(PreventRequestForgery::class)
                ->actingAs($user)
                ->from(route('admin.git_repository.index'))
                ->post(route('admin.git_repository.reconnect_source'))
                ->assertRedirect(route('admin.git_repository.index'))
                ->assertSessionHas('success', 'The private application-managed Git checkout is ready. Check GitHub to verify the repository status.');

            $this->assertSame(realpath($managedPath), trim((string) file_get_contents($registrationPath)));

            file_put_contents($registrationPath, $accountRoot.DIRECTORY_SEPARATOR.'repositories'.DIRECTORY_SEPARATOR.'deleted-checkout'.PHP_EOL);
            app(GitRepositoryService::class)->saveSettings($this->settingsPayload(['enabled' => true]));

            $this->assertSame(realpath($managedPath), trim((string) file_get_contents($registrationPath)));
        } finally {
            Config::set('filesystems.disks.local.root', $originalStorageRoot);
            Storage::forgetDisk('local');
            $this->app->setBasePath($originalBasePath);
            File::deleteDirectory($accountRoot);
        }
    }

    public function test_source_reconnection_does_not_change_registration_when_no_matching_checkout_exists(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'local');
        Storage::fake('local');

        $originalBasePath = base_path();
        $accountRoot = sys_get_temp_dir().DIRECTORY_SEPARATOR.'clinic-git-no-match-'.bin2hex(random_bytes(8));
        $privatePath = $accountRoot.DIRECTORY_SEPARATOR.'private';
        $registrationPath = $privatePath.DIRECTORY_SEPARATOR.'DEPLOYED_GIT_REPOSITORY';

        File::ensureDirectoryExists($privatePath);
        File::ensureDirectoryExists($accountRoot.DIRECTORY_SEPARATOR.'repositories');

        try {
            file_put_contents($registrationPath, 'old-source-path'.PHP_EOL);
            $this->app->setBasePath($privatePath);
            Storage::disk('local')->put('system/git-repository/settings.json', json_encode([
                'enabled' => true,
                'branch' => 'hardening',
                'remote' => 'origin',
                'repository_type' => 'public',
                'repository_url' => 'https://github.com/SH4RTH4K/Clinic-System.git',
                'authentication' => 'none',
                'credential' => null,
                'run_migrations' => false,
                'clear_cache' => true,
                'health_check' => true,
            ], JSON_THROW_ON_ERROR));

            $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
            $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

            $this->withoutMiddleware(PreventRequestForgery::class)
                ->actingAs($user)
                ->from(route('admin.git_repository.index'))
                ->post(route('admin.git_repository.reconnect_source'))
                ->assertRedirect(route('admin.git_repository.index'))
                ->assertSessionHas('error', 'No readable cPanel Git checkout matched the saved repository and branch. Restore the source checkout under the account repositories directory, then reconnect.');

            $this->assertSame('old-source-path', trim((string) file_get_contents($registrationPath)));
        } finally {
            $this->app->setBasePath($originalBasePath);
            File::deleteDirectory($accountRoot);
        }
    }

    public function test_source_reconnection_refuses_ambiguous_matching_cpanel_checkouts(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'local');
        Storage::fake('local');

        $originalBasePath = base_path();
        $accountRoot = sys_get_temp_dir().DIRECTORY_SEPARATOR.'clinic-git-ambiguous-'.bin2hex(random_bytes(8));
        $privatePath = $accountRoot.DIRECTORY_SEPARATOR.'private';
        $registrationPath = $privatePath.DIRECTORY_SEPARATOR.'DEPLOYED_GIT_REPOSITORY';
        $repositoriesPath = $accountRoot.DIRECTORY_SEPARATOR.'repositories';

        File::ensureDirectoryExists($privatePath);
        File::ensureDirectoryExists($repositoriesPath);

        try {
            foreach (['checkout-one', 'checkout-two'] as $checkoutName) {
                $sourcePath = $repositoriesPath.DIRECTORY_SEPARATOR.$checkoutName;
                File::ensureDirectoryExists($sourcePath);
                $this->fixtureGit($sourcePath, ['init', '--quiet', '--initial-branch=hardening']);
                file_put_contents($sourcePath.DIRECTORY_SEPARATOR.'README.md', $checkoutName);
                $this->fixtureGit($sourcePath, ['add', 'README.md']);
                $this->fixtureGit($sourcePath, ['-c', 'user.name=Clinic Test', '-c', 'user.email=test@local.invalid', 'commit', '--quiet', '-m', 'initial']);
                $this->fixtureGit($sourcePath, ['remote', 'add', 'origin', 'https://github.com/SH4RTH4K/Clinic-System.git']);
            }

            file_put_contents($registrationPath, 'existing-registration'.PHP_EOL);
            $this->app->setBasePath($privatePath);
            Storage::disk('local')->put('system/git-repository/settings.json', json_encode([
                'enabled' => true,
                'branch' => 'hardening',
                'remote' => 'origin',
                'repository_type' => 'public',
                'repository_url' => 'https://github.com/SH4RTH4K/Clinic-System.git',
                'authentication' => 'none',
                'credential' => null,
                'run_migrations' => false,
                'clear_cache' => true,
                'health_check' => true,
            ], JSON_THROW_ON_ERROR));

            $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
            $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

            $this->withoutMiddleware(PreventRequestForgery::class)
                ->actingAs($user)
                ->from(route('admin.git_repository.index'))
                ->post(route('admin.git_repository.reconnect_source'))
                ->assertRedirect(route('admin.git_repository.index'))
                ->assertSessionHas('error', 'More than one cPanel Git checkout matched the saved repository and branch. Keep one authoritative checkout or ask the hosting administrator to resolve the duplicate.');

            $this->assertSame('existing-registration', trim((string) file_get_contents($registrationPath)));
        } finally {
            $this->app->setBasePath($originalBasePath);
            File::deleteDirectory($accountRoot);
        }
    }

    public function test_enabling_a_zip_installation_does_not_initialize_git_inside_live_files(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'local');

        $originalBasePath = base_path();
        $applicationPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'clinic-zip-'.bin2hex(random_bytes(8));
        File::ensureDirectoryExists($applicationPath);

        try {
            $this->app->setBasePath($applicationPath);
            Storage::fake('local');

            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('The live application has no registered source checkout.');

            app(GitRepositoryService::class)->saveSettings($this->settingsPayload(['enabled' => true]));
        } finally {
            $this->assertFalse(file_exists($applicationPath.DIRECTORY_SEPARATOR.'.git'));
            Storage::forgetDisk('local');
            $this->app->setBasePath($originalBasePath);
            File::deleteDirectory($applicationPath);
        }
    }

    public function test_managed_checkout_is_initialized_in_private_storage_without_modifying_live_files(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'local');

        $originalBasePath = base_path();
        $accountRoot = sys_get_temp_dir().DIRECTORY_SEPARATOR.'clinic-managed-git-'.bin2hex(random_bytes(8));
        $privatePath = $accountRoot.DIRECTORY_SEPARATOR.'private';
        $publicPath = $accountRoot.DIRECTORY_SEPARATOR.'public_html';
        $sourcePath = $accountRoot.DIRECTORY_SEPARATOR.'fixture-source';

        File::ensureDirectoryExists($privatePath);
        File::ensureDirectoryExists($publicPath);
        File::ensureDirectoryExists($sourcePath);

        try {
            $this->app->setBasePath($privatePath);
            Storage::fake('local');
            $this->fixtureGit($sourcePath, ['init', '--quiet', '--initial-branch=hardening']);
            file_put_contents($sourcePath.DIRECTORY_SEPARATOR.'README.md', 'managed checkout fixture');
            $this->fixtureGit($sourcePath, ['add', 'README.md']);
            $this->fixtureGit($sourcePath, ['-c', 'user.name=Clinic Test', '-c', 'user.email=test@local.invalid', 'commit', '--quiet', '-m', 'initial']);

            $service = app(GitRepositoryService::class);
            $method = new \ReflectionMethod($service, 'initializeManagedCheckout');
            $method->invoke($service, [
                'branch' => 'hardening',
                'remote' => 'origin',
                'repository_url' => $sourcePath,
                'authentication' => 'none',
                'credential' => null,
            ]);

            Storage::disk('local')->assertExists('git-repository/source/README.md');
            $this->assertFalse(file_exists($privatePath.DIRECTORY_SEPARATOR.'.git'));
            $this->assertTrue(is_dir(Storage::disk('local')->path('git-repository/source/.git')));
        } finally {
            Storage::forgetDisk('local');
            $this->app->setBasePath($originalBasePath);
            File::deleteDirectory($accountRoot);
        }
    }

    public function test_repository_settings_reject_invalid_branch_names(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.settings'), $this->settingsPayload(['branch' => '--upload-pack=evil']))
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHasErrors('branch');
    }

    public function test_repository_url_validation_rejects_non_github_urls_without_flashing_credentials(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.settings'), $this->settingsPayload([
                'repository_url' => 'https://attacker.invalid/owner/repo.git',
                'authentication' => 'personal_access_token',
                'credential' => 'synthetic-secret-for-test-only',
            ]))
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHasErrors('repository_url')
            ->assertSessionMissing('_old_input.credential');
    }

    public function test_repository_settings_accept_a_github_ssh_url_and_branch_path_syntax(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.settings'), $this->settingsPayload([
                'branch' => 'release/clinic-2026',
                'repository_type' => 'private',
                'repository_url' => 'git@github.com:SH4RTH4K/Clinic-System.git',
                'authentication' => 'ssh_deploy_key',
                'credential' => "-----BEGIN OPENSSH PRIVATE KEY-----\nfake-test-key\n-----END OPENSSH PRIVATE KEY-----",
            ]))
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('error', 'Git settings and actions are disabled in the automated testing environment.')
            ->assertSessionMissing('_old_input.credential');
    }

    public function test_encrypted_repository_credential_is_never_sent_to_the_page(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('system/git-repository/settings.json', json_encode([
            'enabled' => true,
            'branch' => 'hardening',
            'repository_type' => 'private',
            'repository_url' => 'https://github.com/SH4RTH4K/Clinic-System.git',
            'remote' => 'origin',
            'authentication' => 'personal_access_token',
            'credential' => Crypt::encryptString('synthetic-secret-for-test-only'),
        ], JSON_THROW_ON_ERROR));

        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.git_repository.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('settings.has_credential', true)
                ->missing('settings.credential'));
    }

    public function test_super_admin_sees_only_valid_private_deployment_history_entries(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('system/git-repository/history.json', json_encode([
            [
                'status' => 'completed',
                'branch' => 'hardening',
                'previous_commit' => str_repeat('a', 40),
                'target_commit' => str_repeat('b', 40),
                'commits_applied' => 2,
                'finished_at' => '2026-11-07T12:00:00+06:00',
            ],
            ['status' => 'unexpected', 'branch' => '<script>', 'previous_commit' => 'invalid'],
        ], JSON_THROW_ON_ERROR));

        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.git_repository.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('history', 1)
                ->where('history.0.branch', 'hardening')
                ->where('history.0.status', 'completed'));
    }

    /** @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function settingsPayload(array $overrides = []): array
    {
        return array_merge([
            'enabled' => false,
            'branch' => 'hardening',
            'remote' => 'origin',
            'repository_type' => 'public',
            'repository_url' => 'https://github.com/SH4RTH4K/Clinic-System.git',
            'authentication' => 'none',
            'credential' => '',
            'clear_credential' => false,
            'run_migrations' => false,
            'clear_cache' => true,
            'health_check' => true,
        ], $overrides);
    }

    /** @param list<string> $arguments */
    private function fixtureGit(string $directory, array $arguments): string
    {
        $process = new Process(['git', ...$arguments], $directory);
        $process->mustRun();

        return trim($process->getOutput());
    }
}
