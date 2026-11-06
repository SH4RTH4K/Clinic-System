<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');

        if (! Schema::hasTable($permissionsTable)) {
            throw new RuntimeException('The permissions table must exist before adding system_health.manage.');
        }

        DB::table($permissionsTable)->insertOrIgnore([
            'name' => 'system_health.manage',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'System Health access may have been assigned to roles and cannot be removed safely by rollback.'
        );
    }
};
