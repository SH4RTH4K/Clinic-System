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
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $rolePermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        $timestamp = now();
        $permissions = [
            ['name' => 'manufacturers.view', 'guard_name' => 'web', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'manufacturers.create', 'guard_name' => 'web', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'manufacturers.update', 'guard_name' => 'web', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'manufacturers.delete', 'guard_name' => 'web', 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ];

        DB::table($permissionsTable)->insertOrIgnore($permissions);

        // Grant to Super Admin and Doctor
        $roleIds = DB::table($rolesTable)
            ->whereIn('name', ['Super Admin', 'Doctor'])
            ->where('guard_name', 'web')
            ->pluck('id');

        $permissionIds = DB::table($permissionsTable)
            ->where('guard_name', 'web')
            ->whereIn('name', [
                'manufacturers.view', 'manufacturers.create', 'manufacturers.update', 'manufacturers.delete',
            ])
            ->pluck('id');

        $grants = [];
        foreach ($roleIds as $roleId) {
            foreach ($permissionIds as $permId) {
                $grants[] = [
                    'permission_id' => $permId,
                    'role_id' => $roleId,
                ];
            }
        }

        if ($grants !== []) {
            DB::table($rolePermissionsTable)->insertOrIgnore($grants);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');

        DB::table($permissionsTable)
            ->whereIn('name', [
                'manufacturers.view', 'manufacturers.create', 'manufacturers.update', 'manufacturers.delete',
            ])
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
