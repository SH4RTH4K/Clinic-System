<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DatabaseMigrationManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_database_migration_actions(): void
    {
        $this->post(route('admin.git_repository.database.migrate'))
            ->assertRedirect(route('login'));

        $this->post(route('admin.git_repository.database.rollback'))
            ->assertRedirect(route('login'));

        $this->post(route('admin.git_repository.database.remigrate'))
            ->assertRedirect(route('login'));

        $this->post(route('admin.git_repository.database.clear_caches'))
            ->assertRedirect(route('login'));

        $this->post(route('admin.git_repository.database.rebuild_caches'))
            ->assertRedirect(route('login'));
    }

    public function test_non_super_admin_cannot_access_database_migration_actions(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Doctor', 'web'));

        $this->actingAs($user)
            ->post(route('admin.git_repository.database.migrate'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('admin.git_repository.database.rollback'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('admin.git_repository.database.remigrate'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('admin.git_repository.database.clear_caches'))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('admin.git_repository.database.rebuild_caches'))
            ->assertForbidden();
    }

    public function test_super_admin_sees_database_migration_status_in_git_repository_page(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.git_repository.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/GitRepository')
                ->has('database')
                ->where('database.connected', true)
                ->has('database.migrations')
                ->has('database.tables'));
    }

    public function test_super_admin_can_run_migrations_via_web_route(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutMiddleware(PreventRequestForgery::class)
            ->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.database.migrate'))
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'system_database',
            'event' => 'migrations.run',
        ]);
    }

    public function test_super_admin_can_rollback_and_remigrate_via_web_route(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutMiddleware(PreventRequestForgery::class)
            ->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.database.rollback'), ['step' => 1])
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('success');

        $this->withoutMiddleware(PreventRequestForgery::class)
            ->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.database.remigrate'), ['step' => 1])
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'system_database',
            'event' => 'migrations.rollback',
        ]);

        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'system_database',
            'event' => 'migrations.remigrate',
        ]);
    }

    public function test_super_admin_can_clear_and_rebuild_caches_via_web_route(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutMiddleware(PreventRequestForgery::class)
            ->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.database.clear_caches'))
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('success');

        $this->withoutMiddleware(PreventRequestForgery::class)
            ->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->post(route('admin.git_repository.database.rebuild_caches'))
            ->assertRedirect(route('admin.git_repository.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'system_database',
            'event' => 'cache.cleared',
        ]);

        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'system_database',
            'event' => 'cache.rebuilt',
        ]);
    }

    public function test_throttled_inertia_requests_redirect_with_friendly_error_flash(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutMiddleware(PreventRequestForgery::class);

        // Make requests up to the throttle limit (6 per minute for clear_caches or pull)
        for ($i = 0; $i < 6; $i++) {
            $this->actingAs($user)
                ->from(route('admin.git_repository.index'))
                ->withHeaders(['X-Inertia' => 'true'])
                ->post(route('admin.git_repository.pull'));
        }

        // The 7th request should be throttled and gracefully redirect back with error flash
        $response = $this->actingAs($user)
            ->from(route('admin.git_repository.index'))
            ->withHeaders(['X-Inertia' => 'true'])
            ->post(route('admin.git_repository.pull'));

        $response->assertRedirect(route('admin.git_repository.index'));
        $response->assertSessionHas('error');
        $this->assertStringContainsString('Too many requests', session('error'));
    }
}
