<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\Invoice;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\PatientQueueToken;
use App\Models\Pharmaceutical;
use App\Models\User;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MasterClinicIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $doctorUser;

    private Doctor $doctor;

    private User $receptionistUser;

    private User $cashierUser;

    private User $superAdminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $modules = [
            'patients', 'visits', 'clinical_records', 'medicines', 'pharmaceuticals',
            'inventory', 'symptoms', 'appointments', 'queue', 'billing', 'reports',
            'settings', 'general_settings', 'users', 'roles', 'communications',
        ];
        $actions = ['view', 'create', 'update', 'delete', 'finalize', 'export', 'amend', 'manage'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}", 'guard_name' => 'web']);
            }
        }

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $cashierRole = Role::firstOrCreate(['name' => 'Cashier', 'guard_name' => 'web']);

        $superAdminRole->syncPermissions(Permission::all());

        $doctorRole->syncPermissions([
            'patients.view', 'patients.create', 'patients.update',
            'visits.view', 'visits.create', 'visits.update', 'visits.finalize',
            'clinical_records.view', 'medicines.view', 'pharmaceuticals.view',
            'symptoms.view', 'queue.view', 'appointments.view',
        ]);

        $receptionistRole->syncPermissions([
            'patients.view', 'patients.create', 'patients.update',
            'appointments.view', 'appointments.create', 'appointments.update',
            'queue.view', 'queue.create', 'queue.update',
        ]);

        $cashierRole->syncPermissions([
            'patients.view', 'billing.view', 'billing.create', 'billing.update',
            'inventory.view',
        ]);

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Apex Clinic',
            'clinic_name_bn' => 'রেমেডিক অ্যাপেক্স ক্লিনিক',
            'phone' => '01711223344',
            'address' => 'Mirpur, Dhaka, Bangladesh',
            'doctor_name' => 'Dr. Rafiqul Islam',
            'doctor_credentials' => 'MBBS, BHMS (Gold Medalist)',
            'practice_type' => 'dual',
        ]);

        $this->superAdminUser = $this->makeUser('Super Admin');
        $this->doctorUser = $this->makeUser('Doctor');
        $this->receptionistUser = $this->makeUser('Receptionist');
        $this->cashierUser = $this->makeUser('Cashier');

        $this->doctor = Doctor::create([
            'user_id' => $this->doctorUser->id,
            'name' => 'Dr. Rafiqul Islam',
            'specialization' => 'Integrative General Medicine & Classical Homeopathy',
            'degrees_en' => 'MBBS, BHMS',
            'is_active' => true,
        ]);

        DoctorSchedule::create([
            'doctor_id' => $this->doctor->id,
            'day_of_week' => strtolower(Carbon::today()->format('l')),
            'start_time' => '09:00',
            'end_time' => '17:00',
            'chamber_room' => 'Chamber 1',
            'is_active' => true,
        ]);
    }

    private function makeUser(string $role): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password123!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($role);

        return $user;
    }

    public function test_complete_end_to_end_clinic_lifecycle_integration(): void
    {
        // =========================================================================
        // STEP 1: Front Desk Registers a New Patient
        // =========================================================================
        $patient = Patient::factory()->create([
            'name' => 'Farhana Yasmin',
            'phone' => '01899887766',
            'age_years' => 34,
            'gender' => 'female',
            'guardian_name' => 'Abdul Karim',
            'guardian_relationship' => 'Husband',
            'address' => 'Mirpur 10, Dhaka',
            'blood_group' => 'B+',
        ]);

        $this->assertNotNull($patient, 'Patient must be successfully registered in database');
        $this->assertSame('Farhana Yasmin', $patient->name);

        // =========================================================================
        // STEP 2: Front Desk Books Fast-Track Appointment Slot for Today
        // =========================================================================
        $appointmentPayload = [
            'name' => $patient->name,
            'phone' => $patient->phone,
            'preferred_date' => Carbon::today()->toDateString(),
            'preferred_time' => '11:00',
            'scheduled_date' => Carbon::today()->toDateString(),
            'scheduled_time' => '11:00',
            'schedule_immediately' => true,
            'source' => 'phone',
            'message' => 'Chronic migraine and gastric irritation',
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
        ];

        $apptResponse = $this->actingAs($this->receptionistUser)
            ->post(route('admin.appointment_requests.store'), $appointmentPayload);

        $apptResponse->assertRedirect(route('admin.appointment_requests.index'));

        $appointment = AppointmentRequest::where('converted_patient_id', $patient->id)->latest('id')->first();
        $this->assertNotNull($appointment);
        $this->assertSame('scheduled', $appointment->status);

        // =========================================================================
        // STEP 3: Front Desk Issues Queue Token
        // =========================================================================
        $token = PatientQueueToken::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'token_date' => Carbon::today()->toDateString(),
            'token_number' => 12,
            'token_code' => 'T-012',
            'status' => 'waiting',
        ]);

        $this->assertSame('waiting', $token->status);

        // =========================================================================
        // STEP 4: Doctor Sets Up Remedies, Pharmaceuticals & Batches in Dispensary
        // =========================================================================
        $remedy = Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '30CH',
            'form' => 'drops',
            'is_active' => true,
        ]);

        $remedyBatch = MedicineBatch::create([
            'item_type' => 'remedy',
            'medicine_id' => $remedy->id,
            'batch_number' => 'ARN-2026-B1',
            'expiry_date' => Carbon::today()->addMonths(24),
            'current_quantity' => 50,
            'purchase_price' => 120.00,
            'selling_price' => 200.00,
            'is_active' => true,
        ]);

        $pharma = Pharmaceutical::create([
            'brand_name' => 'Napa Extra',
            'generic_name' => 'Paracetamol + Caffeine',
            'dosage_form' => 'Tablet',
            'strength' => '500mg + 65mg',
            'is_active' => true,
        ]);

        $pharmaBatch = MedicineBatch::create([
            'item_type' => 'pharmaceutical',
            'pharmaceutical_id' => $pharma->id,
            'batch_number' => 'NAP-2026-X1',
            'expiry_date' => Carbon::today()->addMonths(18),
            'current_quantity' => 100,
            'purchase_price' => 2.50,
            'selling_price' => 5.00,
            'is_active' => true,
        ]);

        // =========================================================================
        // STEP 5: Doctor Calls Patient & Finalizes Consultation
        // =========================================================================
        $token->update(['status' => 'calling']);

        $consultationPayload = [
            'patient_id' => $patient->id,
            'token_id' => $token->id,
            'visit_date' => Carbon::today()->toDateString(),
            'chief_complaint' => 'Right-sided pounding headache with nausea, aggravated by noise.',
            'final_diagnosis' => 'Classical Migraine with Gastritis',
            'sync_diagnosis_to_medical_history' => true,
            'redirect_to' => 'show',
            'prescription_items' => [
                [
                    'item_type' => 'remedy',
                    'medicine_id' => $remedy->id,
                    'timing' => ['morning', 'night'],
                    'before_after' => 'before',
                    'dose_qty' => 5,
                    'dose_unit' => 'drops',
                    'duration_days' => 7,
                ],
                [
                    'item_type' => 'pharmaceutical',
                    'pharmaceutical_id' => $pharma->id,
                    'timing' => ['morning', 'afternoon', 'night'],
                    'before_after' => 'after',
                    'dose_qty' => 1,
                    'dose_unit' => 'tablet',
                    'duration_days' => 3,
                ],
            ],
        ];

        $finalizeResponse = $this->actingAs($this->doctorUser)
            ->post(route('admin.visits.finalize'), $consultationPayload);

        $visit = Visit::latest('id')->first();
        $this->assertNotNull($visit, 'Clinical visit record must be stored');
        $this->assertSame($patient->id, $visit->patient_id);
        $finalizeResponse->assertRedirect(route('admin.visits.show', $visit->id));

        // Queue token must automatically be marked completed
        $this->assertSame('completed', $token->fresh()->status);
        $this->assertSame($visit->id, $token->fresh()->visit_id);

        // Patient medical history must be updated with permanent diagnosis snapshot
        $this->assertStringContainsString('Classical Migraine with Gastritis', (string) $patient->fresh()->medical_history);

        // =========================================================================
        // STEP 6: Cashier Executes POS Billing with Cash Tender & Change Calculation
        // =========================================================================
        // Consultation Fee (৳500) + Remedy (1 bottle @ ৳200) + Napa (10 tabs @ ৳5 = ৳50) = ৳750
        // Patient tenders ৳1,000 cash. Change return must be ৳250.
        $invoicePayload = [
            'patient_id' => $patient->id,
            'visit_id' => $visit->id,
            'invoice_date' => Carbon::today()->toDateString(),
            'discount_amount' => 0.00,
            'items' => [
                [
                    'item_type' => 'consultation',
                    'item_name' => 'Doctor Consultation Fee',
                    'quantity' => 1,
                    'unit_price' => 500.00,
                ],
                [
                    'item_type' => 'medicine',
                    'medicine_batch_id' => $remedyBatch->id,
                    'item_name' => 'Arnica Montana 30CH (Drops)',
                    'quantity' => 1,
                    'unit_price' => 200.00,
                ],
                [
                    'item_type' => 'medicine',
                    'medicine_batch_id' => $pharmaBatch->id,
                    'item_name' => 'Napa Extra 500mg (Tablet)',
                    'quantity' => 10,
                    'unit_price' => 5.00,
                ],
            ],
            'initial_payment' => [
                'amount' => 750.00,
                'payment_method' => 'cash',
                'payment_date' => Carbon::today()->toDateString(),
                'notes' => 'Settled in full via Cash POS terminal (Tendered 1000, Change 250)',
            ],
        ];

        $invoiceResponse = $this->actingAs($this->cashierUser)
            ->post(route('admin.invoices.store'), $invoicePayload);

        $invoiceResponse->assertRedirect();

        $invoice = Invoice::where('patient_id', $patient->id)->latest('id')->first();
        $this->assertNotNull($invoice, 'Invoice record must be created');
        $this->assertEquals(750.00, (float) $invoice->total_amount);
        $this->assertEquals(750.00, (float) $invoice->paid_amount);
        $this->assertEquals(0.00, (float) $invoice->due_amount);
        $this->assertSame('paid', $invoice->status);

        // =========================================================================
        // STEP 7: Verify Multi-Dimensional Analytics Reports Studio
        // =========================================================================
        $this->actingAs($this->superAdminUser)
            ->get(route('admin.reports.index', ['date_preset' => 'today']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Reports/Index')
                ->where('metrics.total_consultations', 1)
                ->where('metrics.unique_patients', 1)
                ->where('metrics.finalized_prescriptions', 1)
                ->has('visits.data', 1)
                ->where('visits.data.0.patient.name', 'Farhana Yasmin')
            );

        // =========================================================================
        // STEP 8: Verify Executive Command Dashboard Operational Telemetry
        // =========================================================================
        $this->actingAs($this->superAdminUser)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('practice_type', 'dual')
                ->where('clinic_name', 'RemediQ Apex Clinic')
                ->where('access.queue', true)
                ->where('access.billing', true)
                ->where('metrics.todays_visits', 1)
                ->where('metrics.today_revenue', fn ($val) => (float) $val === 750.0)
                ->where('metrics.total_patients', 1)
            );
    }
}
