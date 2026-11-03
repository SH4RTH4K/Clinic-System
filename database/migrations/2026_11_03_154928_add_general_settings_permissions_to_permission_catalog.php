<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $timestamp = now();
        $permissions = ['view', 'update'];
        $records = array_map(fn (string $action): array => [
            'name' => "general_settings.{$action}",
            'guard_name' => 'web',
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ], $permissions);

        DB::table(config('permission.table_names.permissions', 'permissions'))->insertOrIgnore($records);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep permission catalog entries and role assignments on rollback.
    }
};
