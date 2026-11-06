<?php

namespace App\Services;

use Illuminate\Database\Connection;
use RuntimeException;

class DatabaseBackupSchemaInspector
{
    /** @return list<array<string, mixed>> */
    public function tables(Connection $connection): array
    {
        $databaseName = $this->mysqlDatabaseName($connection);
        $schema = $connection->getSchemaBuilder();

        return $schema->getTables($databaseName);
    }

    /** @return list<array<string, mixed>> */
    public function views(Connection $connection): array
    {
        $databaseName = $this->mysqlDatabaseName($connection);

        return $connection->getSchemaBuilder()->getViews($databaseName);
    }

    public function assertSupportedObjects(Connection $connection): void
    {
        $databaseName = $this->mysqlDatabaseName($connection);

        if ($connection->getSchemaBuilder()->getViews($databaseName) !== []) {
            throw new RuntimeException('Database backup stopped because this database contains views.');
        }

        foreach (['TRIGGERS', 'ROUTINES', 'EVENTS'] as $objectType) {
            $schemaColumn = match ($objectType) {
                'ROUTINES' => 'ROUTINE_SCHEMA',
                'EVENTS' => 'EVENT_SCHEMA',
                default => 'TRIGGER_SCHEMA',
            };
            $count = $connection->selectOne(
                "SELECT COUNT(*) AS aggregate FROM information_schema.{$objectType} WHERE {$schemaColumn} = ?",
                [$databaseName],
            );

            if ((int) ($count->aggregate ?? 0) > 0) {
                throw new RuntimeException("Database backup stopped because this database contains {$objectType}.");
            }
        }
    }

    private function mysqlDatabaseName(Connection $connection): string
    {
        if ($connection->getDriverName() !== 'mysql') {
            throw new RuntimeException('Database backups are supported only for MySQL connections.');
        }

        $databaseName = $connection->getDatabaseName();

        if (! is_string($databaseName) || $databaseName === '') {
            throw new RuntimeException('Could not verify the selected database for backup.');
        }

        return $databaseName;
    }
}
