<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DatabaseBackupService;
use App\Services\SystemBackupRestoreService;
use App\Services\SystemHealthBackupScheduleService;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use PDOException;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SystemHealthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('public');
    }

    public function test_guest_is_redirected_from_system_health(): void
    {
        $this->get(route('admin.system_health.index'))
            ->assertRedirect(route('login'));
    }

    public function test_user_without_manage_permission_is_forbidden_from_system_health(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Receptionist', 'web'));

        $this->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertForbidden();
    }

    public function test_super_admin_can_view_system_health_without_a_direct_permission_assignment(): void
    {
        $role = Role::findOrCreate('Super Admin', 'web');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/SystemHealth')
                ->where('health.application', 'Running')
                ->where('health.database.status', 'Connected')
                ->where('health.laravel_version', app()->version())
                ->where('health.scheduler.enabled', true)
                ->where('health.scheduler.backup_time', '02:00')
                ->where('backupCapabilities.cpanel', true)
                ->has('health.migrations.applied')
                ->has('csrfToken'));

        $this->assertDatabaseMissing('role_has_permissions', [
            'role_id' => $role->id,
            'permission_id' => Permission::findByName('system_health.manage', 'web')->id,
        ]);
    }

    public function test_user_with_manage_permission_can_view_system_health(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/SystemHealth')
                ->where('health.database.status', 'Connected')
                ->where('health.migrations.status', 'Up to date')
                ->where('backupCapabilities.cpanel', false));
    }

    public function test_system_health_reports_views_in_the_active_database_for_restore_safety(): void
    {
        Schema::create('synthetic_system_health_view_source', function ($table): void {
            $table->string('value');
        });
        DB::statement('CREATE VIEW synthetic_system_health_view AS SELECT value FROM synthetic_system_health_view_source');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        try {
            $this->withoutVite()
                ->actingAs($user)
                ->get(route('admin.system_health.index'))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('health.database.view_count', 1));
        } finally {
            DB::statement('DROP VIEW IF EXISTS synthetic_system_health_view');
            Schema::dropIfExists('synthetic_system_health_view_source');
        }
    }

    public function test_upload_directory_markers_do_not_block_media_restore(): void
    {
        Storage::disk('public')->put('.keep', '');
        Storage::disk('public')->put('.htaccess', 'deny from all');

        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('health.storage.uploads.files', 0)
                ->where('health.storage.uploads.bytes', 0));
    }

    public function test_manager_can_set_a_custom_daily_backup_time(): void
    {
        $user = $this->userWithSystemHealthPermission();
        app(SystemHealthBackupScheduleService::class)->save(true, '04:30');

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup_schedule'), [
                'enabled' => '1',
                'backup_time' => '23:15',
            ])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('success');

        $settings = app(SystemHealthBackupScheduleService::class)->settings();
        $this->assertTrue($settings['enabled']);
        $this->assertSame('23:15', $settings['time']);

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('health.scheduler.enabled', true)
                ->where('health.scheduler.backup_time', '23:15'));

        $schedule = new Schedule(config('app.timezone'));
        app(SystemHealthBackupScheduleService::class)->register($schedule);

        $backupEvents = array_values(array_filter(
            $schedule->events(),
            fn ($event): bool => str_contains($event->command, 'system-health:backup full'),
        ));

        $this->assertCount(1, $backupEvents);
        $this->assertSame('15 23 * * *', $backupEvents[0]->expression);
    }

    public function test_manager_can_disable_automatic_backups_without_disabling_manual_backups(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup_schedule'), ['backup_time' => '02:00'])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('success', 'Automatic full backups are disabled. Manual backups remain available.');

        $settings = app(SystemHealthBackupScheduleService::class)->settings();
        $this->assertFalse($settings['enabled']);

        $schedule = new Schedule(config('app.timezone'));
        app(SystemHealthBackupScheduleService::class)->register($schedule);

        $backupEvents = array_filter(
            $schedule->events(),
            fn ($event): bool => str_contains($event->command, 'system-health:backup full'),
        );

        $this->assertCount(0, $backupEvents);
    }

    public function test_invalid_backup_time_is_rejected_without_changing_saved_schedule(): void
    {
        $scheduleService = app(SystemHealthBackupScheduleService::class);
        $scheduleService->save(true, '04:30');
        $user = $this->userWithSystemHealthPermission();

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup_schedule'), [
                'enabled' => '1',
                'backup_time' => '25:75',
            ])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHasErrors('backup_time');

        $this->assertSame('04:30', $scheduleService->settings()['time']);
        $this->assertTrue($scheduleService->settings()['enabled']);
    }

    public function test_user_without_system_health_permission_cannot_change_backup_schedule(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Receptionist', 'web'));

        $this->actingAs($user)
            ->post(route('admin.system_health.backup_schedule'), [
                'enabled' => '1',
                'backup_time' => '23:15',
            ])
            ->assertForbidden();

        $settings = app(SystemHealthBackupScheduleService::class)->settings();
        $this->assertSame('default', $settings['source']);
        $this->assertSame('02:00', $settings['time']);
    }

    public function test_user_without_manage_permission_cannot_create_database_backup(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Receptionist', 'web'));

        $this->actingAs($user)
            ->post(route('admin.system_health.backup'))
            ->assertForbidden();
    }

    public function test_sqlite_disables_database_and_full_backup_but_keeps_cpanel_application_package_available(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $capabilities = app(DatabaseBackupService::class)->capabilities();

        $this->assertFalse($capabilities['database']);
        $this->assertFalse($capabilities['full']);
        $this->assertTrue($capabilities['cpanel']);
        $this->assertTrue($capabilities['media']);

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup'), ['backup_type' => 'database'])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('error', 'The backup was not created. Database backups are supported only for MySQL connections.');

        $this->assertEmpty(app(DatabaseBackupService::class)->history());
    }

    public function test_mysql_enables_database_full_and_cpanel_backup_capabilities(): void
    {
        $connection = \Mockery::mock(Connection::class);
        $connection->shouldReceive('getDriverName')->once()->andReturn('mysql');
        DB::shouldReceive('connection')->once()->andReturn($connection);

        $capabilities = app(DatabaseBackupService::class)->capabilities();

        $this->assertTrue($capabilities['database']);
        $this->assertTrue($capabilities['full']);
        $this->assertTrue($capabilities['cpanel']);
        $this->assertTrue($capabilities['restore']['database']);
        $this->assertTrue($capabilities['restore']['full']);
    }

    public function test_manager_can_download_a_media_backup_created_in_private_storage(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $response = $this->actingAs($user)
            ->post(route('admin.system_health.backup'), [
                'backup_type' => 'media',
                'download_after_create' => '1',
            ]);

        $response->assertOk();
        $response->assertDownload();
        $this->assertCount(1, app(DatabaseBackupService::class)->history());
        $this->assertDatabaseHas('activity_log', ['event' => 'backup.created']);
        $this->assertDatabaseHas('activity_log', ['event' => 'backup.downloaded']);
    }

    public function test_system_health_manager_cannot_create_a_cpanel_deployment_backup(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $this->actingAs($user)
            ->post(route('admin.system_health.backup'), ['backup_type' => 'cpanel'])
            ->assertForbidden();
    }

    public function test_super_admin_can_create_a_cpanel_deployment_backup(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));
        $backupService = \Mockery::mock(DatabaseBackupService::class);
        $backupService->shouldReceive('create')
            ->once()
            ->with('cpanel')
            ->andReturn(sys_get_temp_dir().DIRECTORY_SEPARATOR.'cpanel-20261111-120000-0123456789abcdef.zip');
        $backupService->shouldReceive('pruneExpiredBackups')->once()->andReturn(0);
        $this->app->instance(DatabaseBackupService::class, $backupService);

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup'), ['backup_type' => 'cpanel'])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('success', 'The backup was created in private storage.');

        $this->assertDatabaseHas('activity_log', [
            'event' => 'backup.created',
        ]);
    }

    public function test_system_health_manager_cannot_download_a_cpanel_deployment_backup(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $this->actingAs($user)
            ->get(route('admin.system_health.backups.download', 'cpanel-20261111-120000-0123456789abcdef.zip'))
            ->assertForbidden();
    }

    public function test_system_health_manager_cannot_view_cpanel_deployment_backup_history(): void
    {
        $user = $this->userWithSystemHealthPermission();
        $backupPath = app(DatabaseBackupService::class)->privateBackupDirectory()
            .DIRECTORY_SEPARATOR.'cpanel-20261111-120000-0123456789abcdef.zip';
        file_put_contents($backupPath, 'synthetic-cpanel-backup');

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('backups', []));
    }

    public function test_invalid_download_after_create_value_is_rejected(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup'), [
                'backup_type' => 'database',
                'download_after_create' => 'sometimes',
            ])
            ->assertSessionHasErrors('download_after_create');

        $this->assertEmpty(app(DatabaseBackupService::class)->history());
    }

    public function test_mysql_only_backup_requirement_is_displayed_after_redirect(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $response = $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup'), ['backup_type' => 'database']);

        $response->assertRedirect(route('admin.system_health.index'));

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('flash.error', 'The backup was not created. Database backups are supported only for MySQL connections.'));
    }

    public function test_unrecognized_backup_exception_details_are_not_exposed(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $backupService = \Mockery::mock(DatabaseBackupService::class);
        $backupService->shouldReceive('create')
            ->once()
            ->with('database')
            ->andThrow(new RuntimeException('Sensitive synthetic SQL diagnostic.'));
        $backupService->shouldReceive('history')->once()->andReturn([]);
        $backupService->shouldReceive('capabilities')->once()->andReturn([
            'database' => true,
            'media' => true,
            'full' => true,
            'restore' => ['database' => true, 'media' => true, 'full' => true],
        ]);
        $backupService->shouldReceive('backupStorageStatus')->once()->andReturn('Writable');
        $backupService->shouldReceive('retentionDays')->once()->andReturn(14);
        $this->app->instance(DatabaseBackupService::class, $backupService);

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup'), ['backup_type' => 'database'])
            ->assertRedirect(route('admin.system_health.index'));

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('flash.error', fn (string $message): bool => $message === 'The backup was not created. A database or private-storage operation failed. Detailed exception data was redacted.'
                    && ! str_contains($message, 'Sensitive synthetic SQL diagnostic.')));
    }

    public function test_backup_permission_errors_are_reported_without_exposing_sql_details(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $databaseException = new PDOException('Sensitive SQL and value details.');
        $databaseException->errorInfo = ['42000', 1142, 'Sensitive driver detail.'];
        $queryException = new QueryException('mysql', 'select private_data', ['sensitive-value'], $databaseException);

        $backupService = \Mockery::mock(DatabaseBackupService::class);
        $backupService->shouldReceive('create')
            ->once()
            ->with('database')
            ->andThrow($queryException);
        $backupService->shouldReceive('history')->once()->andReturn([]);
        $backupService->shouldReceive('capabilities')->once()->andReturn([
            'database' => true,
            'media' => true,
            'full' => true,
            'restore' => ['database' => true, 'media' => true, 'full' => true],
        ]);
        $backupService->shouldReceive('backupStorageStatus')->once()->andReturn('Writable');
        $backupService->shouldReceive('retentionDays')->once()->andReturn(14);
        $this->app->instance(DatabaseBackupService::class, $backupService);

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup'), ['backup_type' => 'database'])
            ->assertRedirect(route('admin.system_health.index'));

        $this->withoutVite()
            ->actingAs($user)
            ->get(route('admin.system_health.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('flash.error', 'The backup was not created. MySQL denied a required database or metadata permission. Ask the database administrator to review the backup account privileges.'));
    }

    public function test_system_health_manager_cannot_create_database_backup_when_sqlite_is_selected(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup'), ['backup_type' => 'database'])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('error');

        $this->assertEmpty(app(DatabaseBackupService::class)->history());
    }

    public function test_backup_type_must_be_one_of_the_supported_archive_types(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.backup'), ['backup_type' => 'everything'])
            ->assertSessionHasErrors('backup_type');

        $this->assertEmpty(app(DatabaseBackupService::class)->history());
    }

    public function test_database_backup_refuses_sqlite_without_creating_a_backup(): void
    {
        Schema::create('backup_probe', function ($table): void {
            $table->string('value');
        });
        DB::table('backup_probe')->insert(['value' => 'synthetic-backup-check']);

        try {
            app(DatabaseBackupService::class)->create();
            $this->fail('A database backup must not be created from SQLite.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Database backups are supported only for MySQL connections.', $exception->getMessage());
        }

        $this->assertSame('synthetic-backup-check', DB::table('backup_probe')->value('value'));
        $this->assertEmpty(app(DatabaseBackupService::class)->history());
    }

    public function test_user_can_download_only_a_generated_private_backup(): void
    {
        $user = $this->userWithSystemHealthPermission();
        $path = app(DatabaseBackupService::class)->create('media');
        $this->assertFileExists($path);
        $this->assertSame($path, app(DatabaseBackupService::class)->pathForDownload(basename($path)));

        $this->actingAs($user)
            ->get(route('admin.system_health.backups.download', basename($path)))
            ->assertDownload(basename($path));

        $this->assertDatabaseHas('activity_log', ['event' => 'backup.downloaded']);

        $this->get(route('admin.system_health.backups.download', '..%2Foutside.sql.gz'))
            ->assertNotFound();
    }

    public function test_super_admin_can_permanently_delete_a_generated_backup(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));
        $path = app(DatabaseBackupService::class)->create('media');
        $filename = basename($path);
        $this->assertFileExists($path);
        $this->assertSame($path, app(DatabaseBackupService::class)->pathForDownload($filename));

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->delete(route('admin.system_health.backups.destroy', $filename))
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('success', 'The backup was permanently deleted.');

        $this->assertFileDoesNotExist($path);
        $this->assertDatabaseHas('activity_log', [
            'event' => 'backup.deleted',
            'subject_type' => null,
        ]);
    }

    public function test_system_health_manager_cannot_delete_a_backup(): void
    {
        $user = $this->userWithSystemHealthPermission();
        $path = app(DatabaseBackupService::class)->create('media');
        $this->assertFileExists($path);

        $this->actingAs($user)
            ->delete(route('admin.system_health.backups.destroy', basename($path)))
            ->assertForbidden();

        $this->assertFileExists($path);
        $this->assertDatabaseMissing('activity_log', ['event' => 'backup.deleted']);
    }

    public function test_backup_deletion_rejects_unrecognized_filenames(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->delete(route('admin.system_health.backups.destroy', 'unmanaged-file.txt'))
            ->assertSessionHasErrors('filename');
    }

    public function test_media_backup_contains_synthetic_uploads_without_exposing_them_in_history(): void
    {
        Storage::disk('public')->put('synthetic-check.txt', 'synthetic-media-check');
        $path = app(DatabaseBackupService::class)->create('media');

        try {
            $archive = new \ZipArchive;
            $this->assertSame(true, $archive->open($path));
            $this->assertNotFalse($archive->locateName('uploads/synthetic-check.txt'));

            $history = app(DatabaseBackupService::class)->history();
            $this->assertSame('media', $history[0]['type']);
            $this->assertArrayNotHasKey('contents', $history[0]);
        } finally {
            $archive->close();
            @unlink($path);
        }
    }

    public function test_full_backup_is_unavailable_when_sqlite_is_selected(): void
    {
        $this->assertFalse(app(DatabaseBackupService::class)->capabilities()['full']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Database backups are supported only for MySQL connections.');

        app(DatabaseBackupService::class)->create('full');
    }

    public function test_user_without_manage_permission_cannot_clear_compiled_caches(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Receptionist', 'web'));

        $this->actingAs($user)
            ->post(route('admin.system_health.clear_caches'))
            ->assertForbidden();
    }

    public function test_authorized_user_can_clear_compiled_caches_without_flushing_the_cache_store(): void
    {
        $user = $this->userWithSystemHealthPermission();
        Artisan::shouldReceive('call')->times(4)->andReturn(0);

        $this->actingAs($user)
            ->post(route('admin.system_health.clear_caches'))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('activity_log', ['event' => 'application_cache.cleared']);
    }

    public function test_restore_requires_super_admin_role(): void
    {
        $user = $this->userWithSystemHealthPermission();

        $this->actingAs($user)
            ->post(route('admin.system_health.restore'), [
                'restore_type' => 'database',
                'backup_filename' => 'database-20261106-120000-0123456789abcdef.sql.gz',
                'target_database' => ':memory:',
                'confirmation_phrase' => 'RESTORE EMPTY TARGET',
            ])
            ->assertForbidden();
    }

    public function test_database_restore_rejects_sqlite_connection_without_modifying_it(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));
        $uploadedBackup = UploadedFile::fake()->createWithContent(
            'database-20261106-120000-0123456789abcdef.sql.gz',
            gzencode("-- Clinic System logical database backup.\nSET NAMES utf8mb4;\n"),
        );

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.restore'), [
                'restore_type' => 'database',
                'backup_file' => $uploadedBackup,
                'target_database' => ':memory:',
                'confirmation_phrase' => 'RESTORE EMPTY TARGET',
            ])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('migrations', ['migration' => '2026_11_05_204744_add_system_health_manage_permission']);
    }

    public function test_database_restore_rejects_an_invalid_target_database_name(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.restore'), [
                'restore_type' => 'database',
                'backup_filename' => 'database-20261106-120000-0123456789abcdef.sql.gz',
                'target_database' => 'clinic_app; DROP DATABASE clinic_app',
                'confirmation_phrase' => 'RESTORE EMPTY TARGET',
            ])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHasErrors('target_database');

        $this->assertDatabaseHas('migrations', ['migration' => '2026_11_05_204744_add_system_health_manage_permission']);
    }

    public function test_uploaded_database_restore_cleans_up_temporary_file_when_mysql_is_required(): void
    {
        $uploadedBackup = UploadedFile::fake()->createWithContent(
            'database-20261106-120000-0123456789abcdef.sql.gz',
            gzencode("-- Clinic System logical database backup.\nSET NAMES utf8mb4;\n"),
        );

        try {
            app(SystemBackupRestoreService::class)->restoreUploaded($uploadedBackup, 'database');
            $this->fail('Database restore must reject SQLite connections.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Database restore is supported only for MySQL connections.', $exception->getMessage());
        }

        $this->assertSame([], glob(app(DatabaseBackupService::class)->privateBackupDirectory().'/.restore-upload-*') ?: []);
    }

    public function test_media_backup_restores_only_into_empty_upload_storage(): void
    {
        Storage::disk('public')->put('synthetic-restore.txt', 'synthetic-media-restore');
        $path = app(DatabaseBackupService::class)->create('media');
        Storage::fake('public');

        try {
            app(SystemBackupRestoreService::class)->restore(basename($path), 'media');

            $this->assertSame('synthetic-media-restore', Storage::disk('public')->get('synthetic-restore.txt'));
        } finally {
            @unlink($path);
        }
    }

    public function test_super_admin_can_restore_media_backup_without_database_confirmation(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));
        Storage::disk('public')->put('synthetic-media-restore-source.txt', 'synthetic-media-content');
        $path = app(DatabaseBackupService::class)->create('media');
        Storage::fake('public');

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.restore'), [
                'restore_type' => 'media',
                'backup_filename' => basename($path),
                'confirmation_phrase' => 'RESTORE EMPTY TARGET',
            ])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('success', 'The backup was restored to the empty target.');
    }

    public function test_super_admin_can_upload_and_restore_a_media_backup(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));
        Storage::disk('public')->put('synthetic-upload-restore.txt', 'synthetic-uploaded-media');
        $backupPath = app(DatabaseBackupService::class)->create('media');

        try {
            $uploadedBackup = UploadedFile::fake()->createWithContent(
                basename($backupPath),
                file_get_contents($backupPath),
            );
            Storage::fake('public');

            $this->actingAs($user)
                ->from(route('admin.system_health.index'))
                ->post(route('admin.system_health.restore'), [
                    'restore_type' => 'media',
                    'backup_file' => $uploadedBackup,
                    'confirmation_phrase' => 'RESTORE EMPTY TARGET',
                ])
                ->assertRedirect(route('admin.system_health.index'))
                ->assertSessionHas('success', 'The backup was restored to the empty target.');

            $this->assertSame('synthetic-uploaded-media', Storage::disk('public')->get('synthetic-upload-restore.txt'));
            $this->assertSame([], glob(app(DatabaseBackupService::class)->privateBackupDirectory().'/.restore-upload-*') ?: []);
        } finally {
            if (is_file($backupPath)) {
                unlink($backupPath);
            }
        }
    }

    public function test_uploaded_database_backup_does_not_change_sqlite_test_schema(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));
        $uploadedBackup = UploadedFile::fake()->createWithContent(
            'database-20261106-120000-0123456789abcdef.sql.gz',
            gzencode("-- Clinic System logical database backup.\nDROP TABLE users;\n"),
        );

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.restore'), [
                'restore_type' => 'database',
                'backup_file' => $uploadedBackup,
                'target_database' => ':memory:',
                'confirmation_phrase' => 'RESTORE EMPTY TARGET',
            ])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('migrations', [
            'migration' => '2026_11_05_204744_add_system_health_manage_permission',
        ]);
        $this->assertSame([], glob(app(DatabaseBackupService::class)->privateBackupDirectory().'/.restore-upload-*') ?: []);
    }

    public function test_uploaded_backup_must_match_the_selected_backup_type(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole(Role::findOrCreate('Super Admin', 'web'));

        $this->actingAs($user)
            ->from(route('admin.system_health.index'))
            ->post(route('admin.system_health.restore'), [
                'restore_type' => 'database',
                'backup_file' => UploadedFile::fake()->createWithContent(
                    'media-20261106-120000-0123456789abcdef.zip',
                    'synthetic-invalid-archive',
                ),
                'target_database' => DB::connection()->getDatabaseName(),
                'confirmation_phrase' => 'RESTORE EMPTY TARGET',
            ])
            ->assertRedirect(route('admin.system_health.index'))
            ->assertSessionHasErrors('backup_file');

        $this->assertDatabaseHas('migrations', [
            'migration' => '2026_11_05_204744_add_system_health_manage_permission',
        ]);
    }

    public function test_sqlite_restore_does_not_execute_uploaded_sql(): void
    {
        config(['database.connections.restore_target' => array_merge(config('database.connections.sqlite'), ['database' => ':memory:'])]);
        DB::purge('restore_target');
        DB::setDefaultConnection('restore_target');

        try {
            $uploadedBackup = UploadedFile::fake()->createWithContent(
                'database-20261106-120000-0123456789abcdef.sql.gz',
                gzencode("-- Clinic System logical database backup.\nDROP TABLE users;\n"),
            );

            try {
                app(SystemBackupRestoreService::class)->restoreUploaded($uploadedBackup, 'database', ':memory:');
                $this->fail('An uploaded backup containing an unapproved statement must be rejected.');
            } catch (RuntimeException $exception) {
                $this->assertSame('The restore target must be an existing database on the configured MySQL server.', $exception->getMessage());
            }

            $this->assertSame([], Schema::connection('restore_target')->getTables());
        } finally {
            DB::setDefaultConnection('sqlite');
            DB::purge('restore_target');
            config(['database.connections.restore_target' => null]);
        }
    }

    public function test_full_backup_restore_rejects_sqlite_before_writing(): void
    {
        $fullArchivePath = tempnam(sys_get_temp_dir(), 'clinic-full-restore-');
        $archive = new \ZipArchive;
        $archive->open($fullArchivePath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        $archive->addFromString('database.sql.gz', gzencode("-- Clinic System logical database backup.\nSET NAMES utf8mb4;\n"));
        $archive->addFromString('media.zip', 'synthetic-media-archive');
        $archive->close();
        $uploadedBackup = UploadedFile::fake()->createWithContent(
            'full-20261106-120000-0123456789abcdef.zip',
            file_get_contents($fullArchivePath),
        );

        try {
            app(SystemBackupRestoreService::class)->restoreUploaded($uploadedBackup, 'full', ':memory:');
            $this->fail('Full database restore must reject SQLite connections.');
        } catch (RuntimeException $exception) {
            $this->assertSame('The restore target must be an existing database on the configured MySQL server.', $exception->getMessage());
        } finally {
            if (is_file($fullArchivePath)) {
                unlink($fullArchivePath);
            }
        }
    }

    public function test_scheduled_backup_command_creates_a_full_backup_by_default(): void
    {
        $backupService = \Mockery::mock(DatabaseBackupService::class);
        $backupService->shouldReceive('create')
            ->once()
            ->with('full')
            ->andReturn(sys_get_temp_dir().DIRECTORY_SEPARATOR.'full-20261106-120000-0123456789abcdef.zip');
        $backupService->shouldReceive('pruneExpiredBackups')->once()->andReturn(2);
        $this->app->instance(DatabaseBackupService::class, $backupService);

        $this->artisan('system-health:backup')
            ->expectsOutput('Created backup: full-20261106-120000-0123456789abcdef.zip')
            ->expectsOutput('Removed 2 expired backup(s).')
            ->assertExitCode(0);
    }

    public function test_retention_prunes_only_generated_backups_older_than_fourteen_days(): void
    {
        $backupService = app(DatabaseBackupService::class);
        $root = $backupService->privateBackupDirectory();
        $expired = $root.DIRECTORY_SEPARATOR.'database-20261001-120000-0123456789abcdef.sql.gz';
        $recent = $root.DIRECTORY_SEPARATOR.'media-20261106-120000-fedcba9876543210.zip';
        $unrecognized = $root.DIRECTORY_SEPARATOR.'keep-this-file.txt';
        file_put_contents($expired, 'synthetic-old-backup');
        file_put_contents($recent, 'synthetic-recent-backup');
        file_put_contents($unrecognized, 'synthetic-unmanaged-file');
        touch($expired, now()->subDays(15)->getTimestamp());

        $removed = $backupService->pruneExpiredBackups();

        $this->assertSame(1, $removed);
        $this->assertFileDoesNotExist($expired);
        $this->assertFileExists($recent);
        $this->assertFileExists($unrecognized);
    }

    public function test_cpanel_backup_path_and_retention_are_read_from_configuration(): void
    {
        $configuredPath = Storage::disk('local')->path('cpanel-private-backups');
        config([
            'system_health.backup_path' => $configuredPath,
            'system_health.backup_retention_days' => 30,
        ]);

        $backupPath = app(DatabaseBackupService::class)->create('media');

        $this->assertSame(realpath($configuredPath), dirname($backupPath));
        $this->assertSame(30, app(DatabaseBackupService::class)->retentionDays());
    }

    public function test_cpanel_backup_path_must_be_absolute(): void
    {
        config(['system_health.backup_path' => 'clinic-backups']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('The configured backup path must be absolute.');

        app(DatabaseBackupService::class)->create('media');
    }

    private function userWithSystemHealthPermission(): User
    {
        $permission = Permission::findOrCreate('system_health.manage', 'web');
        $role = Role::findOrCreate('System Health Manager', 'web');
        $role->givePermissionTo($permission);

        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        return $user;
    }
}
