<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $rolesTable = config('permission.table_names.roles', 'roles');
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolePermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        $superAdminRoleId = DB::table($rolesTable)
            ->where('name', 'Super Admin')
            ->where('guard_name', 'web')
            ->value('id');

        if ($superAdminRoleId === null) {
            return;
        }

        $permissionIds = DB::table($permissionsTable)
            ->where('guard_name', 'web')
            ->whereNotIn('name', ['visits.cancel_other', 'symptom_medicine_map.review'])
            ->pluck('id');

        $grants = $permissionIds->map(fn (int $permissionId): array => [
            'permission_id' => $permissionId,
            'role_id' => $superAdminRoleId,
        ])->all();

        if ($grants !== []) {
            DB::table($rolePermissionsTable)->insertOrIgnore($grants);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Super Admin permission grants are additive and may include grants made after this migration; rollback is not safe.'
        );
    }
};
