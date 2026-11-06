<?php

namespace Database\Seeders;

use App\Models\ClinicSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class ProductionSetupSeeder extends Seeder
{
    public function __construct(private readonly string $adminEmail, private readonly string $adminPassword) {}

    public function run(): void
    {
        Validator::make([
            'email' => $this->adminEmail,
            'password' => $this->adminPassword,
        ], [
            'email' => ['required', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', Password::min(16)->mixedCase()->numbers()->symbols(), 'not_regex:/[\x00-\x1F\x7F]/'],
        ])->validate();

        DB::transaction(function (): void {
            if (User::query()->exists() || Role::query()->exists()) {
                throw new RuntimeException('Production setup requires an installation without existing users or roles.');
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();
            foreach (['prescription_options.create', 'prescription_options.delete'] as $permission) {
                Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            }

            $superAdmin = Role::create(['name' => 'Super Admin', 'guard_name' => 'web']);
            $superAdmin->givePermissionTo(Permission::query()->where('guard_name', 'web')->whereNotIn('name', [
                'visits.finalize', 'visits.cancel', 'visits.cancel_other', 'clinical_records.view',
                'medicines.create', 'medicines.update', 'medicines.delete',
                'symptoms.create', 'symptoms.update', 'symptoms.delete',
                'symptom_medicine_map.create', 'symptom_medicine_map.update',
                'symptom_medicine_map.delete', 'symptom_medicine_map.review',
            ])->get());

            $doctor = Role::create(['name' => 'Doctor', 'guard_name' => 'web']);
            $doctor->givePermissionTo([
                'patients.view', 'patients.create', 'patients.update',
                'visits.view', 'visits.create', 'visits.update', 'clinical_records.view',
                'medicines.view', 'symptoms.view', 'symptom_medicine_map.view',
                'appointments.view', 'appointments.update', 'reports.view', 'reports.export',
            ]);
            $receptionist = Role::create(['name' => 'Receptionist', 'guard_name' => 'web']);
            $receptionist->givePermissionTo([
                'patients.view', 'patients.create', 'patients.update',
                'appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete',
            ]);
            Role::create(['name' => 'Accountant', 'guard_name' => 'web'])->givePermissionTo('reports.view');

            $admin = User::create([
                'name' => 'Super Admin',
                'username' => 'superadmin',
                'email' => $this->adminEmail,
                'password' => $this->adminPassword,
                'is_active' => true,
                'must_change_password' => true,
            ]);
            $admin->assignRole($superAdmin);

            ClinicSetting::create([
                'clinic_name_en' => config('app.name'),
                'doctor_name' => '',
                'doctor_credentials' => '',
                'address' => '',
                'phone' => '',
            ]);
            (new PatientNumberingProfileSeeder)->run();
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });
    }
}
