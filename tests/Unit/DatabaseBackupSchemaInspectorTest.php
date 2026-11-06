<?php

namespace Tests\Unit;

use App\Services\DatabaseBackupSchemaInspector;
use Illuminate\Database\Connection;
use Illuminate\Database\Schema\Builder;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class DatabaseBackupSchemaInspectorTest extends TestCase
{
    use MockeryPHPUnitIntegration;

    public function test_mysql_backup_table_inventory_is_scoped_to_the_selected_database(): void
    {
        $connection = Mockery::mock(Connection::class);
        $schemaBuilder = Mockery::mock(Builder::class);
        $tables = [['name' => 'patients', 'schema' => 'clinic_app']];

        $connection->shouldReceive('getSchemaBuilder')->once()->andReturn($schemaBuilder);
        $connection->shouldReceive('getDriverName')->once()->andReturn('mysql');
        $connection->shouldReceive('getDatabaseName')->once()->andReturn('clinic_app');
        $schemaBuilder->shouldReceive('getTables')->once()->with('clinic_app')->andReturn($tables);

        $this->assertSame($tables, (new DatabaseBackupSchemaInspector)->tables($connection));
    }

    public function test_sqlite_is_rejected_for_backup_table_inventory(): void
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('getDriverName')->once()->andReturn('sqlite');
        $connection->shouldNotReceive('getDatabaseName');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Database backups are supported only for MySQL connections.');

        (new DatabaseBackupSchemaInspector)->tables($connection);
    }

    public function test_mysql_view_inventory_is_scoped_to_the_selected_database(): void
    {
        $connection = Mockery::mock(Connection::class);
        $schemaBuilder = Mockery::mock(Builder::class);
        $views = [['name' => 'clinic_app.synthetic_view', 'schema' => 'clinic_app']];

        $connection->shouldReceive('getSchemaBuilder')->once()->andReturn($schemaBuilder);
        $connection->shouldReceive('getDriverName')->once()->andReturn('mysql');
        $connection->shouldReceive('getDatabaseName')->once()->andReturn('clinic_app');
        $schemaBuilder->shouldReceive('getViews')->once()->with('clinic_app')->andReturn($views);

        $this->assertSame($views, (new DatabaseBackupSchemaInspector)->views($connection));
    }

    public function test_sqlite_is_rejected_for_backup_view_inventory(): void
    {
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('getDriverName')->once()->andReturn('sqlite');
        $connection->shouldNotReceive('getDatabaseName');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Database backups are supported only for MySQL connections.');

        (new DatabaseBackupSchemaInspector)->views($connection);
    }

    public function test_views_from_other_schemas_do_not_block_a_database_backup(): void
    {
        $connection = Mockery::mock(Connection::class);
        $schemaBuilder = Mockery::mock(Builder::class);
        $connection->shouldReceive('getDriverName')->once()->andReturn('mysql');
        $connection->shouldReceive('getDatabaseName')->once()->andReturn('clinic_app');
        $connection->shouldReceive('getSchemaBuilder')->once()->andReturn($schemaBuilder);
        $schemaBuilder->shouldReceive('getViews')->once()->with('clinic_app')->andReturn([]);
        $connection->shouldReceive('selectOne')->times(3)->andReturn((object) ['aggregate' => 0]);

        (new DatabaseBackupSchemaInspector)->assertSupportedObjects($connection);
    }

    public function test_a_view_in_the_selected_database_stops_database_backup(): void
    {
        $connection = Mockery::mock(Connection::class);
        $schemaBuilder = Mockery::mock(Builder::class);
        $connection->shouldReceive('getDriverName')->once()->andReturn('mysql');
        $connection->shouldReceive('getDatabaseName')->once()->andReturn('clinic_app');
        $connection->shouldReceive('getSchemaBuilder')->once()->andReturn($schemaBuilder);
        $schemaBuilder->shouldReceive('getViews')->once()->with('clinic_app')->andReturn([['name' => 'clinic_app.synthetic_view']]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Database backup stopped because this database contains views.');

        (new DatabaseBackupSchemaInspector)->assertSupportedObjects($connection);
    }
}
