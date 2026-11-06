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
        $permissions = [];

        foreach (['advice_items', 'food_restrictions'] as $module) {
            foreach (['view', 'create', 'update', 'delete'] as $action) {
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
     * Reverse the migrations.
     */
    public function down(): void {}
};
