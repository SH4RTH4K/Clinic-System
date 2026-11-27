<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class InvoiceWorkstationTest extends TestCase
{
    use RefreshDatabase;

    private User $authorizedCashier;

    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'billing.view',
            'billing.create',
            'billing.update',
            'billing.delete',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $cashierRole = Role::firstOrCreate(['name' => 'Cashier', 'guard_name' => 'web']);
        $cashierRole->givePermissionTo($permissions);

        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->authorizedCashier = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->authorizedCashier->assignRole($cashierRole);

        $this->patient = Patient::factory()->create([
            'name' => 'Mohammad Rahim',
            'phone' => '01711223344',
            'gender' => 'male',
            'patient_code' => 'P-2026-0001',
        ]);
    }

    public function test_authorized_cashier_can_view_invoices_workstation_with_kpis(): void
    {
        Invoice::create([
            'invoice_number' => 'INV-2026-0001',
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 1200.00,
            'discount_amount' => 100.00,
            'tax_amount' => 0.00,
            'total_amount' => 1100.00,
            'paid_amount' => 600.00,
            'due_amount' => 500.00,
            'status' => 'partially_paid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        $response = $this->actingAs($this->authorizedCashier)
            ->get(route('admin.invoices.index'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Billing/Index')
                ->has('invoices.data', 1)
                ->has('filters')
                ->has('metrics', fn (Assert $metrics) => $metrics
                    ->where('total_invoiced', fn ($val) => (float) $val === 1100.0)
                    ->where('total_collected', fn ($val) => (float) $val === 600.0)
                    ->where('total_due', fn ($val) => (float) $val === 500.0)
                    ->where('due_invoices_count', 1)
                    ->where('paid_invoices_count', 0)
                    ->has('unpaid_count')
                    ->has('today_collected')
                )
            );
    }

    public function test_unauthorized_staff_cannot_view_invoices(): void
    {
        $unauthorized = User::factory()->create(['is_active' => true, 'must_change_password' => false]);

        $this->actingAs($unauthorized)
            ->get(route('admin.invoices.index'))
            ->assertForbidden();
    }

    public function test_invoices_search_filters_by_invoice_number_and_patient_name(): void
    {
        $patient2 = Patient::factory()->create([
            'name' => 'Fatema Khatun',
            'phone' => '01899887766',
            'gender' => 'female',
            'patient_code' => 'P-2026-0002',
        ]);

        Invoice::create([
            'invoice_number' => 'INV-2026-1001',
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 500.00,
            'total_amount' => 500.00,
            'paid_amount' => 500.00,
            'due_amount' => 0.00,
            'status' => 'paid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        Invoice::create([
            'invoice_number' => 'INV-2026-1002',
            'patient_id' => $patient2->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 800.00,
            'total_amount' => 800.00,
            'paid_amount' => 0.00,
            'due_amount' => 800.00,
            'status' => 'unpaid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        $response = $this->actingAs($this->authorizedCashier)
            ->get(route('admin.invoices.index', ['search' => 'Fatema']));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Billing/Index')
                ->has('invoices.data', 1)
                ->where('invoices.data.0.invoice_number', 'INV-2026-1002')
            );
    }

    public function test_invoices_status_filter_isolates_due_invoices(): void
    {
        Invoice::create([
            'invoice_number' => 'INV-DUE-01',
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 700.00,
            'total_amount' => 700.00,
            'paid_amount' => 200.00,
            'due_amount' => 500.00,
            'status' => 'partially_paid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        Invoice::create([
            'invoice_number' => 'INV-PAID-01',
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 400.00,
            'total_amount' => 400.00,
            'paid_amount' => 400.00,
            'due_amount' => 0.00,
            'status' => 'paid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        $response = $this->actingAs($this->authorizedCashier)
            ->get(route('admin.invoices.index', ['status' => 'due']));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Billing/Index')
                ->has('invoices.data', 1)
                ->where('invoices.data.0.invoice_number', 'INV-DUE-01')
            );
    }

    public function test_invoices_payment_method_filter(): void
    {
        $inv1 = Invoice::create([
            'invoice_number' => 'INV-BKASH-01',
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 600.00,
            'total_amount' => 600.00,
            'paid_amount' => 600.00,
            'due_amount' => 0.00,
            'status' => 'paid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        Payment::create([
            'invoice_id' => $inv1->id,
            'payment_number' => 'PAY-001',
            'amount' => 600.00,
            'payment_method' => 'bkash',
            'transaction_reference' => 'BKASH987654',
            'payment_date' => now()->toDateString(),
            'received_by' => $this->authorizedCashier->id,
        ]);

        $inv2 = Invoice::create([
            'invoice_number' => 'INV-CASH-01',
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 300.00,
            'total_amount' => 300.00,
            'paid_amount' => 300.00,
            'due_amount' => 0.00,
            'status' => 'paid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        Payment::create([
            'invoice_id' => $inv2->id,
            'payment_number' => 'PAY-002',
            'amount' => 300.00,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'received_by' => $this->authorizedCashier->id,
        ]);

        $response = $this->actingAs($this->authorizedCashier)
            ->get(route('admin.invoices.index', ['payment_method' => 'bkash']));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Billing/Index')
                ->has('invoices.data', 1)
                ->where('invoices.data.0.invoice_number', 'INV-BKASH-01')
            );
    }

    public function test_invoices_export_csv_streams_ledger_data(): void
    {
        Invoice::create([
            'invoice_number' => 'INV-EXP-001',
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 1500.00,
            'discount_amount' => 100.00,
            'total_amount' => 1400.00,
            'paid_amount' => 1000.00,
            'due_amount' => 400.00,
            'status' => 'partially_paid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        $response = $this->actingAs($this->authorizedCashier)
            ->get(route('admin.invoices.export'));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('attachment; filename="invoices-billing-ledger-', (string) $response->headers->get('Content-Disposition'));

        $content = $response->streamedContent();
        $this->assertStringContainsString('INV-EXP-001', $content);
        $this->assertStringContainsString('Mohammad Rahim', $content);
        $this->assertStringContainsString('1400.00', $content);
        $this->assertStringContainsString('400.00', $content);
    }

    public function test_authorized_cashier_can_collect_due_payment_and_update_status(): void
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-SETTLE-01',
            'patient_id' => $this->patient->id,
            'invoice_date' => now()->toDateString(),
            'subtotal' => 1000.00,
            'total_amount' => 1000.00,
            'paid_amount' => 400.00,
            'due_amount' => 600.00,
            'status' => 'partially_paid',
            'created_by' => $this->authorizedCashier->id,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'item_type' => 'consultation',
            'item_name' => 'Consultation Fee',
            'quantity' => 1,
            'unit_price' => 1000.00,
            'total_price' => 1000.00,
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'payment_number' => 'PAY-INIT-01',
            'amount' => 400.00,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'received_by' => $this->authorizedCashier->id,
        ]);

        $response = $this->actingAs($this->authorizedCashier)
            ->post(route('admin.invoices.payments.store', $invoice->id), [
                'amount' => 600.00,
                'payment_method' => 'cash',
                'payment_date' => now()->toDateString(),
                'notes' => 'Settling remaining due',
            ]);

        $response->assertSessionHas('success');

        $fresh = $invoice->fresh();
        $this->assertSame(1000.0, (float) $fresh->paid_amount);
        $this->assertSame(0.0, (float) $fresh->due_amount);
        $this->assertSame('paid', $fresh->status);
    }
}
