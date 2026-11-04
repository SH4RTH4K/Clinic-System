<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $rolePermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        DB::table($permissionsTable)->insertOrIgnore([
            'name' => 'clinical_records.view',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $doctorRoleId = DB::table($rolesTable)
            ->where('name', 'Doctor')
            ->where('guard_name', 'web')
            ->value('id');
        $permissionId = DB::table($permissionsTable)
            ->where('name', 'clinical_records.view')
            ->where('guard_name', 'web')
            ->value('id');

        if ($doctorRoleId !== null && $permissionId !== null) {
            DB::table($rolePermissionsTable)->insertOrIgnore([
                'role_id' => $doctorRoleId,
                'permission_id' => $permissionId,
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Clinical chart access grants may be assigned to existing roles and cannot be removed by rollback.'
        );
    }
};
