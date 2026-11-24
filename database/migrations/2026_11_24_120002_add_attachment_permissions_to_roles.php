<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permissions = [
            'attachments.view',
            'attachments.create',
            'attachments.delete',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $superAdmin = Role::where('name', 'Super Admin')->where('guard_name', 'web')->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo($permissions);
        }

        $doctor = Role::where('name', 'Doctor')->where('guard_name', 'web')->first();
        if ($doctor) {
            $doctor->givePermissionTo($permissions);
        }

        $receptionist = Role::where('name', 'Receptionist')->where('guard_name', 'web')->first();
        if ($receptionist) {
            $receptionist->givePermissionTo(['attachments.view', 'attachments.create']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['attachments.view', 'attachments.create', 'attachments.delete'] as $name) {
            Permission::where('name', $name)->where('guard_name', 'web')->delete();
        }
    }
};
