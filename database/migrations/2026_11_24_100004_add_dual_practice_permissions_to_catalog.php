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

        $featurePermissions = [
            'pharmaceuticals' => ['view', 'create', 'update', 'delete'],
            'lab_investigations' => ['view', 'create', 'update', 'delete'],
        ];

        $timestamp = now();
        $permissions = [];

        foreach ($featurePermissions as $feature => $actions) {
            foreach ($actions as $action) {
                $permissions[] = [
                    'name' => "{$feature}.{$action}",
                    'guard_name' => 'web',
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }
        }

        DB::table($permissionsTable)->insertOrIgnore($permissions);

        // Grant to Super Admin
        $superAdminRoleId = DB::table($rolesTable)
            ->where('name', 'Super Admin')
            ->where('guard_name', 'web')
            ->value('id');

        if ($superAdminRoleId !== null) {
            $newPermissionIds = DB::table($permissionsTable)
                ->where('guard_name', 'web')
                ->whereIn('name', [
                    'pharmaceuticals.view', 'pharmaceuticals.create', 'pharmaceuticals.update', 'pharmaceuticals.delete',
                    'lab_investigations.view', 'lab_investigations.create', 'lab_investigations.update', 'lab_investigations.delete',
                ])
                ->pluck('id');

            $grants = $newPermissionIds->map(fn (int $permissionId): array => [
                'permission_id' => $permissionId,
                'role_id' => $superAdminRoleId,
            ])->all();

            if ($grants !== []) {
                DB::table($rolePermissionsTable)->insertOrIgnore($grants);
            }
        }

        // Grant view/create/update to Doctor role
        $doctorRoleId = DB::table($rolesTable)
            ->where('name', 'Doctor')
            ->where('guard_name', 'web')
            ->value('id');

        if ($doctorRoleId !== null) {
            $doctorPermissionIds = DB::table($permissionsTable)
                ->where('guard_name', 'web')
                ->whereIn('name', [
                    'pharmaceuticals.view',
                    'lab_investigations.view',
                ])
                ->pluck('id');

            $doctorGrants = $doctorPermissionIds->map(fn (int $permissionId): array => [
                'permission_id' => $permissionId,
                'role_id' => $doctorRoleId,
            ])->all();

            if ($doctorGrants !== []) {
                DB::table($rolePermissionsTable)->insertOrIgnore($doctorGrants);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive catalog permissions kept on rollback
    }
};
