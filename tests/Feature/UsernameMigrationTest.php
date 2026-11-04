<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UsernameMigrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.url' => null,
        ]);
        DB::purge('sqlite');

        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));

        $this->artisan('migrate:fresh', ['--database' => 'sqlite', '--force' => true]);
    }

    protected function tearDown(): void
    {
        DB::disconnect('sqlite');
        DB::purge('sqlite');

        parent::tearDown();
    }

    public function test_fresh_install_has_a_required_unique_username_and_username_login_works(): void
    {
        $usernameColumn = collect(Schema::getColumns('users'))->firstWhere('name', 'username');
        $usernameIndex = collect(Schema::getIndexes('users'))->first(
            fn (array $index): bool => $index['unique'] && $index['columns'] === ['username']
        );
        $user = User::factory()->create([
            'username' => 'fresh-install-user',
            'must_change_password' => false,
        ]);

        $this->assertNotNull($usernameColumn);
        $this->assertFalse($usernameColumn['nullable']);
        $this->assertNotNull($usernameIndex);

        $this->post('/login', [
            'username' => 'fresh-install-user',
            'password' => 'password',
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
    }

    public function test_missing_usernames_are_backfilled_without_changing_account_identity_or_access(): void
    {
        $role = Role::create(['name' => 'Migration Test Doctor', 'guard_name' => 'web']);
        $permission = Permission::create(['name' => 'migration.test.permission', 'guard_name' => 'web']);
        $role->givePermissionTo($permission);
        $user = User::factory()->create([
            'username' => 'temporary-name',
            'password' => Hash::make('preserved-password'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($role);
        $userId = $user->id;
        $passwordHash = $user->password;
        $doctor = Doctor::create([
            'name' => 'Synthetic Doctor',
            'user_id' => $userId,
            'is_active' => true,
        ]);
        $activityId = DB::table('activity_log')->insertGetId([
            'description' => 'Synthetic username migration test',
            'causer_type' => User::class,
            'causer_id' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertSame($userId, $doctor->fresh()->user_id);

        $this->makeUsernameColumnNullable();
        DB::table('users')->where('id', $userId)->update(['username' => null]);

        $this->usernameMigration()->up();

        $user = $user->fresh();
        $this->assertSame($userId, $user->id);
        $this->assertSame('clinic-user-'.$userId, $user->username);
        $this->assertSame($passwordHash, $user->password);
        $this->assertTrue(Hash::check('preserved-password', $user->password));
        $this->assertTrue($user->hasRole($role));
        $this->assertTrue($user->can($permission->name));
        $this->assertTrue($user->is_active);
        $this->assertSame($userId, $doctor->fresh()->user_id);
        $this->assertDatabaseHas('activity_log', [
            'id' => $activityId,
            'causer_type' => User::class,
            'causer_id' => $userId,
        ]);
        $this->assertDatabaseHas('model_has_roles', [
            'model_id' => $userId,
            'role_id' => $role->id,
            'model_type' => User::class,
        ]);

        $this->post('/login', [
            'username' => 'clinic-user-'.$userId,
            'password' => 'preserved-password',
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
    }

    public function test_forward_migration_recovers_when_username_column_is_missing(): void
    {
        $user = User::factory()->create(['username' => 'temporary-name']);

        $this->dropUsernameUniqueIndex();
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('username');
        });

        $this->usernameMigration()->up();

        $this->assertSame('clinic-user-'.$user->id, $user->fresh()->username);
        $this->assertFalse(collect(Schema::getColumns('users'))
            ->firstWhere('name', 'username')['nullable']);
        $this->assertNotNull(collect(Schema::getIndexes('users'))->first(
            fn (array $index): bool => $index['unique'] && $index['columns'] === ['username']
        ));
    }

    public function test_blank_usernames_use_deterministic_collision_safe_values_and_migration_can_retry(): void
    {
        $userMissingUsername = User::factory()->create(['username' => '']);
        $userOccupyingGeneratedName = User::factory()->create([
            'username' => 'clinic-user-'.$userMissingUsername->id,
        ]);
        $userWithWhitespaceUsername = User::factory()->create(['username' => '   ']);
        $partiallyBackfilledUser = User::factory()->create(['username' => 'partial-temp']);

        $this->makeUsernameColumnNullable();
        DB::table('users')->where('id', $userMissingUsername->id)->update(['username' => null]);
        DB::table('users')->where('id', $partiallyBackfilledUser->id)
            ->update(['username' => 'clinic-user-'.$partiallyBackfilledUser->id]);

        $migration = $this->usernameMigration();
        $migration->up();
        $firstGeneratedUsername = $userMissingUsername->fresh()->username;
        $migration->up();

        $this->assertSame('clinic-user-'.$userMissingUsername->id.'-2', $firstGeneratedUsername);
        $this->assertSame($firstGeneratedUsername, $userMissingUsername->fresh()->username);
        $this->assertSame('clinic-user-'.$userWithWhitespaceUsername->id, $userWithWhitespaceUsername->fresh()->username);
        $this->assertSame('clinic-user-'.$userMissingUsername->id, $userOccupyingGeneratedName->fresh()->username);
        $this->assertSame('clinic-user-'.$partiallyBackfilledUser->id, $partiallyBackfilledUser->fresh()->username);
        $this->assertDatabaseHas('users', ['id' => $userMissingUsername->id, 'username' => $firstGeneratedUsername]);
    }

    public function test_existing_valid_usernames_are_preserved_including_case_distinct_values(): void
    {
        $upperCaseUsername = User::factory()->create(['username' => 'ClinicDoctor']);
        $lowerCaseUsername = User::factory()->create(['username' => 'clinicdoctor']);

        $this->usernameMigration()->up();

        $this->assertSame('ClinicDoctor', $upperCaseUsername->fresh()->username);
        $this->assertSame('clinicdoctor', $lowerCaseUsername->fresh()->username);
    }

    public function test_duplicate_usernames_under_column_collation_stop_before_backfill(): void
    {
        $firstDuplicate = User::factory()->create(['username' => 'CollisionName']);
        $secondDuplicate = User::factory()->create(['username' => 'another-name']);
        $missingUsername = User::factory()->create(['username' => '']);

        $this->dropUsernameUniqueIndex();
        $this->makeUsernameColumnNullable();
        DB::table('users')->where('id', $firstDuplicate->id)->update(['username' => 'CollisionName']);
        DB::table('users')->where('id', $secondDuplicate->id)->update(['username' => 'CollisionName']);
        DB::table('users')->where('id', $missingUsername->id)->update(['username' => null]);

        try {
            $this->usernameMigration()->up();
            $this->fail('Duplicate usernames should stop the migration.');
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Duplicate usernames exist under the database collation. Resolve them manually before continuing.',
                $exception->getMessage()
            );
        }

        $this->assertDatabaseHas('users', ['id' => $missingUsername->id, 'username' => null]);
        $this->assertDatabaseHas('users', ['id' => $firstDuplicate->id, 'username' => 'CollisionName']);
        $this->assertDatabaseHas('users', ['id' => $secondDuplicate->id, 'username' => 'CollisionName']);
    }

    public function test_existing_non_unique_index_does_not_block_unique_constraint_creation(): void
    {
        User::factory()->create(['username' => 'existing-username']);
        $this->dropUsernameUniqueIndex();
        Schema::table('users', function (Blueprint $table): void {
            $table->index('username', 'users_username_unique');
        });

        $this->usernameMigration()->up();

        $uniqueUsernameIndex = collect(Schema::getIndexes('users'))->first(
            fn (array $index): bool => $index['unique'] && $index['columns'] === ['username']
        );

        $this->assertNotNull($uniqueUsernameIndex);
        $this->assertSame('users_username_unique_hardened_1', $uniqueUsernameIndex['name']);
    }

    public function test_existing_case_insensitive_collisions_are_rejected_when_column_collation_is_case_insensitive(): void
    {
        $firstCaseVariant = User::factory()->create(['username' => 'CaseSensitiveName']);
        $secondCaseVariant = User::factory()->create(['username' => 'case-sensitive-name']);

        $this->dropUsernameUniqueIndex();
        $this->setUsernameColumnCollation('NOCASE');
        DB::table('users')->where('id', $secondCaseVariant->id)->update(['username' => 'casesensitivename']);

        try {
            $this->usernameMigration()->up();
            $this->fail('Case-insensitive duplicate usernames should stop the migration.');
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Duplicate usernames exist under the database collation. Resolve them manually before continuing.',
                $exception->getMessage()
            );
        }

        $this->assertDatabaseHas('users', ['id' => $firstCaseVariant->id, 'username' => 'CaseSensitiveName']);
        $this->assertDatabaseHas('users', ['id' => $secondCaseVariant->id, 'username' => 'casesensitivename']);
    }

    public function test_username_migration_rollbacks_cannot_delete_login_identities(): void
    {
        $user = User::factory()->create(['username' => 'protected-login']);
        $historicalMigration = require database_path('migrations/2026_09_27_173149_add_username_to_users_table.php');
        $forwardMigration = $this->usernameMigration();

        foreach ([$historicalMigration, $forwardMigration] as $migration) {
            try {
                $migration->down();
                $this->fail('Username migrations must refuse destructive rollback.');
            } catch (RuntimeException) {
                $this->assertDatabaseHas('users', [
                    'id' => $user->id,
                    'username' => 'protected-login',
                ]);
            }
        }
    }

    private function usernameMigration(): Migration
    {
        return require database_path('migrations/2026_11_03_202810_backfill_and_enforce_usernames_safely.php');
    }

    private function dropUsernameUniqueIndex(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_username_unique');
        });
    }

    private function makeUsernameColumnNullable(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('username')->nullable()->change();
        });
    }

    private function setUsernameColumnCollation(string $collation): void
    {
        Schema::table('users', function (Blueprint $table) use ($collation): void {
            $table->string('username')->collation($collation)->nullable()->change();
        });
    }
}
