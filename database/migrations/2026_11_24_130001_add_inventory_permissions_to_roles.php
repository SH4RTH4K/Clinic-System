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
            'inventory.view',
            'inventory.create',
            'inventory.update',
            'inventory.delete',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        // Grant to Super Admin
        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo($permissions);
        }

        // Grant to Doctor
        $doctor = Role::where('name', 'Doctor')->first();
        if ($doctor) {
            $doctor->givePermissionTo(['inventory.view']);
        }

        // Grant to Receptionist
        $receptionist = Role::where('name', 'Receptionist')->first();
        if ($receptionist) {
            $receptionist->givePermissionTo(['inventory.view', 'inventory.create', 'inventory.update']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = [
            'inventory.view',
            'inventory.create',
            'inventory.update',
            'inventory.delete',
        ];

        foreach ($permissions as $name) {
            Permission::where('name', $name)->delete();
        }
    }
};
