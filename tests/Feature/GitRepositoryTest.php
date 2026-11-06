<?php

namespace Tests\Feature;

use App\Models\User;
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

    public function test_super_admin_can_view_repository_status_but_local_git_actions_are_disabled(): void
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
                ->where('settings.configuration_message', 'Settings and Git actions are disabled in local and test environments.')
                ->where('settings.branch', 'hardening')
                ->has('history', 0));
    }

    public function test_repository_check_is_rejected_outside_production_without_running_git(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.check'))
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('error', 'Git-changing actions are disabled outside production.');
    }

    public function test_repository_settings_cannot_be_saved_from_local_or_test_environment(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.settings'), $this->settingsPayload())
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('error', 'Repository settings can only be changed in production.');

        Storage::disk('local')->assertMissing('system/git-repository/settings.json');
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
        ], $overrides);
    }
}
