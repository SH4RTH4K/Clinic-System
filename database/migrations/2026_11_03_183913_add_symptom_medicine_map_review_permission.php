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
        DB::table(config('permission.table_names.permissions', 'permissions'))->insertOrIgnore([
            'name' => 'symptom_medicine_map.review',
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
            'The Symptom Map review permission may have role grants and cannot be removed by rollback.'
        );
    }
};
