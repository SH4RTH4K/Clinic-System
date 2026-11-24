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
            'communications.view',
            'communications.send',
            'communications.manage',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        // Super Admin
        $superAdmin = Role::where('name', 'Super Admin')->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo($permissions);
        }

        // Doctor
        $doctor = Role::where('name', 'Doctor')->first();
        if ($doctor) {
            $doctor->givePermissionTo($permissions);
        }

        // Receptionist
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
            'communications.view',
            'communications.send',
            'communications.manage',
        ];

        foreach ($permissions as $name) {
            Permission::where('name', $name)->delete();
        }
    }
};
