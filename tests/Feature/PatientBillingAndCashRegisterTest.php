<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitLabInvestigation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PatientBillingAndCashRegisterTest extends TestCase
{
    use RefreshDatabase;

    private User $receptionist;

    private User $unauthorizedUser;

    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'billing.view',
            'billing.create',
            'billing.update',
            'billing.delete',
            'patients.view',
            'clinical_records.view',
            'visits.view',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $receptionistRole->givePermissionTo($permissions);

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->receptionist = User::factory()->create([
            'email' => 'cashier@remediq.test',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->receptionist->assignRole($receptionistRole);
        $this->receptionist->givePermissionTo($permissions);

        $this->unauthorizedUser = User::factory()->create([
            'email' => 'guest@remediq.test',
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $this->patient = Patient::factory()->create([
            'name' => 'Anisul Huq',
            'phone' => '01711223344',
        ]);

        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'doctor_name' => 'Dr. M. Rahman',
            'doctor_credentials' => 'BHMS, DHMS',
            'phone' => '01800000000',
            'address' => 'Mirpur, Dhaka',
            'default_consultation_fee' => 600.00,
        ]);
    }

    public function test_authorized_user_can_view_invoices_list_and_metrics(): void
    {
        Invoice::factory()->create([
            'patient_id' => $this->patient->id,
            'invoice_number' => 'INV-202611-0001',
            'subtotal' => 1000.00,
            'total_amount' => 1000.00,
            'paid_amount' => 1000.00,
            'due_amount' => 0.00,
            'status' => 'paid',
        ]);

        Invoice::factory()->create([
            'patient_id' => $this->patient->id,
            'invoice_number' => 'INV-202611-0002',
            'subtotal' => 800.00,
            'total_amount' => 800.00,
            'paid_amount' => 300.00,
            'due_amount' => 500.00,
            'status' => 'partially_paid',
        ]);

        $response = $this->actingAs($this->receptionist)->get(route('admin.invoices.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Billing/Index')
            ->has('invoices.data', 2)
            ->where('metrics.total_invoiced', 1800)
            ->where('metrics.total_collected', 1300)
            ->where('metrics.total_due', 500)
            ->where('metrics.unpaid_count', 1)
        );
    }

    public function test_authorized_user_can_create_invoice_with_initial_payment(): void
    {
        $payload = [
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'discount_amount' => 100.00,
            'discount_type' => 'fixed',
            'notes' => 'Patient consultation bill',
            'items' => [
                [
                    'item_type' => 'consultation',
                    'item_name' => 'Specialist Consultation Fee',
                    'quantity' => 1,
                    'unit_price' => 600.00,
                ],
                [
                    'item_type' => 'medicine',
                    'item_name' => 'Arnica Montana 200C (Dilution 30ml)',
                    'quantity' => 2,
                    'unit_price' => 150.00,
                ],
            ],
            'initial_payment' => [
                'amount' => 800.00,
                'payment_method' => 'bkash',
                'transaction_reference' => 'BK78945612',
                'payment_date' => now()->toDateString(),
                'notes' => 'Full bKash payment',
            ],
        ];

        $response = $this->actingAs($this->receptionist)->post(route('admin.invoices.store'), $payload);

        $response->assertRedirect();

        // Subtotal = 600 + (2 * 150) = 900. Discount = 100. Total = 800. Paid = 800. Due = 0. Status = paid.
        $this->assertDatabaseHas('invoices', [
            'patient_id' => $this->patient->id,
            'subtotal' => 900.00,
            'discount_amount' => 100.00,
            'total_amount' => 800.00,
            'paid_amount' => 800.00,
            'due_amount' => 0.00,
            'status' => 'paid',
        ]);

        $invoice = Invoice::where('patient_id', $this->patient->id)->latest('id')->first();

        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'item_type' => 'consultation',
            'unit_price' => 600.00,
        ]);

        $this->assertDatabaseHas('payments', [
            'invoice_id' => $invoice->id,
            'payment_method' => 'bkash',
            'amount' => 800.00,
            'transaction_reference' => 'BK78945612',
            'received_by' => $this->receptionist->id,
        ]);
    }

    public function test_can_build_invoice_items_automatically_from_clinical_visit(): void
    {
        $doctorUser = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $doctor = Doctor::create([
            'name' => 'Dr. M. Rahman',
            'user_id' => $doctorUser->id,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $visit = Visit::factory()->create([
            'patient_id' => $this->patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'finalized',
        ]);

        $remedy = Medicine::create([
            'name' => 'Thuja Occidentalis',
            'potency' => '1M',
            'form' => 'drops',
            'is_active' => true,
        ]);

        // Inventory batch with selling price 220
        MedicineBatch::factory()->forRemedy($remedy)->create([
            'selling_price' => 220.00,
            'current_quantity' => 15,
        ]);

        PrescriptionItem::create([
            'visit_id' => $visit->id,
            'item_type' => 'remedy',
            'medicine_id' => $remedy->id,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 5,
            'dose_unit' => 'drops',
            'dilution_note' => 'with water',
        ]);

        VisitLabInvestigation::create([
            'visit_id' => $visit->id,
            'test_name' => 'Complete Blood Count (CBC)',
            'status' => 'ordered',
        ]);

        // Request create page with visit_id
        $response = $this->actingAs($this->receptionist)->get(route('admin.invoices.create', [
            'visit_id' => $visit->id,
            'patient_id' => $this->patient->id,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Billing/Create')
            ->where('initialData.visit_id', $visit->id)
            ->where('initialData.default_consultation_fee', 600)
            ->has('initialData.items', 3) // consultation, remedy with batch price 220, lab test
        );
    }

    public function test_can_record_subsequent_payments_and_update_due_balance(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-TEST-0001',
            'patient_id' => $this->patient->id,
            'subtotal' => 1000.00,
            'total_amount' => 1000.00,
            'paid_amount' => 0.00,
            'due_amount' => 1000.00,
            'status' => 'unpaid',
            'invoice_date' => now()->toDateString(),
            'created_by' => $this->receptionist->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'item_type' => 'consultation',
            'item_name' => 'Consultation Fee',
            'quantity' => 1,
            'unit_price' => 1000.00,
            'total_price' => 1000.00,
        ]);

        // First payment: Partial 400 BDT Cash
        $firstPayment = [
            'payment_method' => 'cash',
            'amount' => 400.00,
            'payment_date' => now()->toDateString(),
            'notes' => 'Partial cash downpayment',
        ];

        $response = $this->actingAs($this->receptionist)
            ->post(route('admin.invoices.payments.store', $invoice->id), $firstPayment);

        $response->assertRedirect();

        $invoice->refresh();
        $this->assertEquals(400.00, $invoice->paid_amount);
        $this->assertEquals(600.00, $invoice->due_amount);
        $this->assertEquals('partially_paid', $invoice->status);

        // Second payment: Remaining 600 BDT Nagad
        $secondPayment = [
            'payment_method' => 'nagad',
            'amount' => 600.00,
            'transaction_reference' => 'NAG998877',
            'payment_date' => now()->toDateString(),
            'notes' => 'Remaining balance cleared via Nagad',
        ];

        $this->actingAs($this->receptionist)
            ->post(route('admin.invoices.payments.store', $invoice->id), $secondPayment);

        $invoice->refresh();
        $this->assertEquals(1000.00, $invoice->paid_amount);
        $this->assertEquals(0.00, $invoice->due_amount);
        $this->assertEquals('paid', $invoice->status);
    }

    public function test_cash_register_report_calculates_collections_by_method(): void
    {
        $invoice = Invoice::factory()->create([
            'patient_id' => $this->patient->id,
            'total_amount' => 1500.00,
            'invoice_date' => now()->toDateString(),
        ]);

        Payment::create([
            'payment_number' => 'PAY-CR-01',
            'invoice_id' => $invoice->id,
            'payment_method' => 'cash',
            'amount' => 500.00,
            'payment_date' => now()->toDateString(),
            'received_by' => $this->receptionist->id,
        ]);

        Payment::create([
            'payment_number' => 'PAY-CR-02',
            'invoice_id' => $invoice->id,
            'payment_method' => 'bkash',
            'amount' => 700.00,
            'payment_date' => now()->toDateString(),
            'received_by' => $this->receptionist->id,
        ]);

        $response = $this->actingAs($this->receptionist)
            ->get(route('admin.billing.cash_register', [
                'start_date' => now()->toDateString(),
                'end_date' => now()->toDateString(),
            ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Billing/CashRegister')
            ->where('report.summary.total_collected', 1200)
            ->where('report.by_payment_method.cash', 500)
            ->where('report.by_payment_method.bkash', 700)
            ->where('report.by_payment_method.nagad', 0)
        );
    }

    public function test_print_views_render_standard_and_thermal_pos_layouts(): void
    {
        $invoice = Invoice::factory()->create([
            'patient_id' => $this->patient->id,
            'invoice_number' => 'INV-PRINT-01',
        ]);

        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'item_name' => 'Consultation',
            'total_price' => 500.00,
        ]);

        // Standard Print
        $stdResponse = $this->actingAs($this->receptionist)->get(route('admin.invoices.print', $invoice->id));
        $stdResponse->assertOk();
        $stdResponse->assertInertia(fn ($page) => $page
            ->component('Admin/Billing/Print')
            ->where('mode', 'standard')
        );

        // Thermal POS Receipt
        $posResponse = $this->actingAs($this->receptionist)->get(route('admin.invoices.pos_receipt', $invoice->id));
        $posResponse->assertOk();
        $posResponse->assertInertia(fn ($page) => $page
            ->component('Admin/Billing/Print')
            ->where('mode', 'thermal_pos')
        );
    }

    public function test_unauthorized_user_cannot_access_billing_operations(): void
    {
        $response = $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.invoices.index'));

        $response->assertForbidden();

        $createResponse = $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.invoices.create'));

        $createResponse->assertForbidden();

        $postResponse = $this->actingAs($this->unauthorizedUser)
            ->post(route('admin.invoices.store'), [
                'patient_id' => $this->patient->id,
                'items' => [],
            ]);

        $postResponse->assertForbidden();
    }
}
