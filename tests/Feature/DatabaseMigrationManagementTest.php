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
}
