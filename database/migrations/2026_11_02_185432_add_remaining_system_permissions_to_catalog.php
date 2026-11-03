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
        $modules = [
            'patients',
            'visits',
            'medicines',
            'symptoms',
            'symptom_medicine_map',
            'appointments',
            'reports',
            'settings',
            'users',
            'roles',
            'activity_logs',
        ];
        $actions = ['view', 'create', 'update', 'delete', 'export', 'amend'];
        $timestamp = now();
        $permissions = [];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                $permissions[] = [
                    'name' => "{$module}.{$action}",
                    'guard_name' => 'web',
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }
        }

        DB::table(config('permission.table_names.permissions', 'permissions'))
            ->insertOrIgnore($permissions);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Keep catalog entries on rollback so assignments added after deployment are not lost.
     */
    public function down(): void {}
};
