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
            'queue.view',
            'queue.manage',
            'calendar.view',
            'calendar.manage',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        // Assign to Super Admin
        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo($permissions);
        }

        // Assign to Doctor
        $doctor = Role::where('name', 'Doctor')->first();
        if ($doctor) {
            $doctor->givePermissionTo($permissions);
        }

        // Assign to Receptionist
        $receptionist = Role::where('name', 'Receptionist')->first();
        if ($receptionist) {
            $receptionist->givePermissionTo($permissions);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = [
            'queue.view',
            'queue.manage',
            'calendar.view',
            'calendar.manage',
        ];

        foreach ($permissions as $name) {
            Permission::where('name', $name)->delete();
        }
    }
};
