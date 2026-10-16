<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Roles and Permissions
        $modules = ['patients', 'visits', 'medicines', 'symptoms', 'symptom_medicine_map', 'appointments', 'reports', 'settings', 'users', 'roles'];
        $actions = ['view', 'create', 'update', 'delete', 'export'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                // Not all modules need all actions, but we can create them all and assign specifically
                Permission::firstOrCreate(['name' => "{$module}.{$action}"]);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctor = Role::firstOrCreate(['name' => 'Doctor']);
        $receptionist = Role::firstOrCreate(['name' => 'Receptionist']);
        $accountant = Role::firstOrCreate(['name' => 'Accountant']);

        // Give Super Admin all permissions
        $superAdmin->givePermissionTo(Permission::all());

        // Doctor permissions
        $doctor->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update', 'patients.delete',
            'visits.view', 'visits.create', 'visits.update', 'visits.delete',
            'medicines.view', 'medicines.create', 'medicines.update', 'medicines.delete',
            'symptoms.view', 'symptoms.create', 'symptoms.update', 'symptoms.delete',
            'symptom_medicine_map.view', 'symptom_medicine_map.create', 'symptom_medicine_map.update', 'symptom_medicine_map.delete',
            'appointments.view', 'appointments.update',
            'reports.view', 'reports.export',
        ]);

        // Receptionist permissions
        $receptionist->givePermissionTo([
            'patients.view', 'patients.create', 'patients.update',
            'visits.view',
            'medicines.view',
            'symptoms.view',
            'appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete',
        ]);

        $accountant->givePermissionTo(['reports.view']);

        // Create one Super Admin User
        $admin = User::firstOrCreate([
            'username' => 'superadmin', 'email' => 'superadmin@clinic.com',
        ], [
            'name' => 'Super Admin',
            'password' => Hash::make('ChangeMe123!'),
            'phone' => '01700000000',
            'is_active' => true,
            'must_change_password' => true,
        ]);
        if (! $admin->hasRole('Super Admin')) {
            $admin->assignRole('Super Admin');
        }

        // Clinic Settings Default
        DB::table('clinic_settings')->updateOrInsert(['id' => 1], [
            'clinic_name_en' => 'JB Homeo Hall',
            'clinic_name_bn' => 'জে বি হোমিও হল',
            'doctor_name' => 'Dr. Md. Fazlul Karim',
            'doctor_credentials' => 'D.H.M.S, B.H.B',
            'govt_reg_no' => '123456',
            'address' => 'Sutrapur, Bogura',
            'phone' => '01700000000',
            'patient_no_series' => 'A',
            'patient_no_next' => 1,
        ]);

        // Advice Items Default
        $advices = [
            ['text_en' => 'Take medicine regularly, and shake the bottle 10 times before each dose.', 'text_bn' => 'নিয়মিত ঔষধ সেবন করুন এবং প্রতিবার সেবনের আগে বোতলটি ১০ বার ঝাঁকিয়ে নিন।', 'is_default' => true],
            ['text_en' => 'Drink pure/boiled water.', 'text_bn' => 'বিশুদ্ধ/ফোটানো পানি পান করুন।', 'is_default' => true],
            ['text_en' => 'Take adequate rest.', 'text_bn' => 'পর্যাপ্ত বিশ্রাম নিন।', 'is_default' => true],
        ];
        foreach ($advices as $advice) {
            DB::table('advice_items')->updateOrInsert(['text_en' => $advice['text_en']], $advice);
        }

        // Food Restrictions Default
        $foods = [
            ['text_en' => 'No smoking.', 'text_bn' => 'ধূমপান নিষেধ।', 'is_default' => true],
            ['text_en' => 'Avoid excess spicy or salty food; avoid raw/added salt at the table.', 'text_bn' => 'অতিরিক্ত মশলাযুক্ত বা লবণাক্ত খাবার এড়িয়ে চলুন; কাঁচা লবণ খাবেন না।', 'is_default' => true],
            ['text_en' => 'Avoid red meat.', 'text_bn' => 'গরু বা খাসির মাংস এড়িয়ে চলুন।', 'is_default' => true],
            ['text_en' => 'Avoid duck meat and duck eggs.', 'text_bn' => 'হাঁসের মাংস এবং হাঁসের ডিম এড়িয়ে চলুন।', 'is_default' => true],
            ['text_en' => 'Avoid hilsa fish and prawns/shrimp.', 'text_bn' => 'ইলিশ মাছ এবং চিংড়ি এড়িয়ে চলুন।', 'is_default' => true],
            ['text_en' => 'Avoid any food the patient is personally allergic to.', 'text_bn' => 'যেসব খাবারে এলার্জি আছে সেগুলো এড়িয়ে চলুন।', 'is_default' => true],
        ];
        foreach ($foods as $food) {
            DB::table('food_restrictions')->updateOrInsert(['text_en' => $food['text_en']], $food);
        }
    }
}
