<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Models\User;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ExecutiveDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function setupPermissions(): void
    {
        $permissions = [
            'clinical_records.view',
            'visits.view',
            'patients.view',
            'appointments.view',
            'medicines.view',
            'doctors.view',
            'queue.view',
            'billing.view',
            'reports.view',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }
    }

    private function createExecutiveUser(array $perms = []): User
    {
        $this->setupPermissions();
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'Executive Role', 'guard_name' => 'web']);
        $role->syncPermissions($perms);
        $user->assignRole($role);

        return $user;
    }

    public function test_dashboard_provides_six_tile_kpis_and_practice_metadata_for_authorized_staff(): void
    {
        ClinicSetting::create([
            'clinic_name_en' => 'Apex Healthcare',
            'clinic_name_bn' => 'এপেক্স হেলথকেয়ার',
            'practice_type' => 'dual',
            'doctor_name' => 'Dr. Rahman',
            'doctor_credentials' => 'MBBS, BHMS',
            'address' => 'Dhaka, Bangladesh',
            'phone' => '01711111111',
        ]);

        $doctorUser = User::factory()->create();
        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'name' => 'Dr. Rahman',
            'specialization' => 'Homeopathy & General',
            'is_active' => true,
        ]);

        $patient = Patient::factory()->create(['name' => 'Rahim Uddin']);

        // Queue Token
        PatientQueueToken::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'waiting',
            'created_at' => Carbon::today()->setHour(10),
        ]);

        $user = $this->createExecutiveUser([
            'clinical_records.view',
            'visits.view',
            'patients.view',
            'appointments.view',
            'queue.view',
            'billing.view',
            'reports.view',
        ]);

        // Invoice
        Invoice::create([
            'invoice_number' => 'INV-2026-0001',
            'patient_id' => $patient->id,
            'subtotal' => 1000,
            'discount_amount' => 100,
            'tax_amount' => 0,
            'total_amount' => 900,
            'paid_amount' => 500,
            'due_amount' => 400,
            'status' => 'partially_paid',
            'invoice_date' => Carbon::today()->toDateString(),
            'created_by' => $user->id,
        ]);

        // Visit
        Visit::factory()->for($patient)->create([
            'doctor_id' => $doctor->id,
            'visit_date' => Carbon::today()->toDateString(),
            'chief_complaint' => 'Chronic Migraine',
            'status' => 'finalized',
        ]);

        // Pending Appointment Request
        AppointmentRequest::create([
            'name' => 'Karim Ahmed',
            'phone' => '01822222222',
            'status' => 'pending',
            'request_date' => Carbon::today(),
            'notes' => 'Headache and fever',
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('practice_type', 'dual')
                ->where('clinic_name', 'Apex Healthcare')
                ->where('access.queue', true)
                ->where('access.billing', true)
                ->where('access.reports', true)
                ->where('access.visits', true)
                ->where('metrics.waiting_queue_count', 1)
                ->where('metrics.today_revenue', fn ($val) => (float) $val === 500.0)
                ->where('metrics.due_invoices_count', 1)
                ->where('metrics.todays_visits', 1)
                ->where('metrics.pending_requests', 1)
                ->where('metrics.total_patients', 1)
            );
    }

    public function test_dashboard_omits_queue_and_billing_metrics_when_permissions_are_missing(): void
    {
        $user = $this->createExecutiveUser([
            'patients.view',
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('access.queue', false)
                ->where('access.billing', false)
                ->missing('metrics.waiting_queue_count')
                ->missing('metrics.today_revenue')
                ->missing('metrics.due_invoices_count')
            );
    }
}
