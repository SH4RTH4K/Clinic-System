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
        $featurePermissions = [
            'doctors' => ['view', 'create', 'update', 'delete'],
            'prescription_options' => ['view', 'update'],
            'clinic_settings' => ['view', 'update'],
            'patient_config' => ['view', 'create', 'update', 'delete'],
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

        DB::table(config('permission.table_names.permissions', 'permissions'))
            ->insertOrIgnore($permissions);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep catalog entries and assignments on rollback.
    }
};
