<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GitRepositoryService;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
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
    }

    public function test_super_admin_can_view_repository_status_but_git_actions_are_disabled_in_testing(): void
    {
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
            'Git checkout check failed. The application directory is not a readable Git checkout. A ZIP deployment or incomplete .git metadata can cause this. Ask the hosting administrator to verify or restore the full Git metadata; this page will not replace it.',
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
}
