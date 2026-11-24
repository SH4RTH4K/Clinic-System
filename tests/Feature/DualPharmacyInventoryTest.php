<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\Pharmaceutical;
use App\Models\PrescriptionItem;
use App\Models\StockTransaction;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class DualPharmacyInventoryTest extends TestCase
{
    use RefreshDatabase;

    private User $doctorUser;

    private User $unauthorizedUser;

    private Medicine $remedy;

    private Pharmaceutical $pharma;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'inventory.view',
            'inventory.create',
            'inventory.update',
            'inventory.delete',
            'patients.view',
            'clinical_records.view',
            'visits.view',
            'visits.create',
            'visits.update',
            'visits.finalize',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo($permissions);

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->doctorUser = User::factory()->create([
            'email' => 'doctor@remediq.test',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->doctorUser->assignRole($doctorRole);
        $this->doctorUser->givePermissionTo($permissions);

        Doctor::create([
            'name' => 'Dr. Rahman',
            'user_id' => $this->doctorUser->id,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->unauthorizedUser = User::factory()->create([
            'email' => 'staff@remediq.test',
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $this->remedy = Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '200C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        $this->pharma = Pharmaceutical::create([
            'brand_name' => 'Napa Extra',
            'generic_name' => 'Paracetamol + Caffeine',
            'dosage_form' => 'tablet',
            'strength' => '500mg + 65mg',
            'is_active' => true,
        ]);
    }

    public function test_authorized_user_can_view_inventory_batches_list(): void
    {
        MedicineBatch::factory()->forRemedy($this->remedy)->create([
            'batch_number' => 'ARN-2026-001',
            'current_quantity' => 25,
        ]);

        MedicineBatch::factory()->forPharmaceutical($this->pharma)->create([
            'batch_number' => 'NAP-2026-002',
            'current_quantity' => 100,
        ]);

        $response = $this->actingAs($this->doctorUser)->get(route('admin.inventory.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Inventory/Index')
            ->has('batches.data', 2)
            ->has('metrics')
        );
    }

    public function test_authorized_user_can_filter_low_stock_and_expiring_batches(): void
    {
        // Low stock batch
        MedicineBatch::factory()->forRemedy($this->remedy)->create([
            'batch_number' => 'LOW-01',
            'current_quantity' => 3,
            'reorder_level' => 5,
            'expiry_date' => now()->addMonths(6),
        ]);

        // Normal batch
        MedicineBatch::factory()->forPharmaceutical($this->pharma)->create([
            'batch_number' => 'NORM-02',
            'current_quantity' => 50,
            'reorder_level' => 10,
            'expiry_date' => now()->addYear(),
        ]);

        // Filter low stock
        $response = $this->actingAs($this->doctorUser)->get(route('admin.inventory.index', ['status' => 'low_stock']));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Inventory/Index')
            ->has('batches.data', 1)
            ->where('batches.data.0.batch_number', 'LOW-01')
        );
    }

    public function test_authorized_user_can_create_remedy_inventory_batch_with_initial_transaction(): void
    {
        $payload = [
            'item_type' => 'remedy',
            'medicine_id' => $this->remedy->id,
            'batch_number' => 'BATCH-ARN-001',
            'potency' => '200C',
            'form' => 'dilution_30ml',
            'unit' => 'bottle',
            'initial_quantity' => 10,
            'purchase_price' => 120.50,
            'selling_price' => 200.00,
            'reorder_level' => 2,
            'expiry_date' => now()->addMonths(12)->toDateString(),
            'purchase_date' => now()->toDateString(),
            'supplier_name' => 'Boiron Labs',
            'notes' => 'Imported original stock',
        ];

        $response = $this->actingAs($this->doctorUser)->post(route('admin.inventory.store'), $payload);

        $response->assertRedirect(route('admin.inventory.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('medicine_batches', [
            'item_type' => 'remedy',
            'medicine_id' => $this->remedy->id,
            'batch_number' => 'BATCH-ARN-001',
            'current_quantity' => 10,
            'reorder_level' => 2,
        ]);

        $batch = MedicineBatch::where('batch_number', 'BATCH-ARN-001')->firstOrFail();

        $this->assertDatabaseHas('stock_transactions', [
            'medicine_batch_id' => $batch->id,
            'transaction_type' => 'purchase',
            'quantity' => 10,
            'balance_after' => 10,
            'performed_by' => $this->doctorUser->id,
        ]);
    }

    public function test_authorized_user_can_create_pharmaceutical_inventory_batch(): void
    {
        $payload = [
            'item_type' => 'pharmaceutical',
            'pharmaceutical_id' => $this->pharma->id,
            'batch_number' => 'B-NAPA-2026',
            'form' => 'tablet',
            'unit' => 'strip',
            'initial_quantity' => 150,
            'purchase_price' => 25.00,
            'selling_price' => 35.00,
            'reorder_level' => 20,
            'expiry_date' => now()->addMonths(18)->toDateString(),
            'purchase_date' => now()->toDateString(),
            'supplier_name' => 'Beximco Pharma Ltd',
        ];

        $response = $this->actingAs($this->doctorUser)->post(route('admin.inventory.store'), $payload);

        $response->assertRedirect(route('admin.inventory.index'));

        $this->assertDatabaseHas('medicine_batches', [
            'item_type' => 'pharmaceutical',
            'pharmaceutical_id' => $this->pharma->id,
            'batch_number' => 'B-NAPA-2026',
            'current_quantity' => 150,
        ]);
    }

    public function test_authorized_user_can_adjust_stock_with_ledger_tracking(): void
    {
        $batch = MedicineBatch::factory()->forRemedy($this->remedy)->create([
            'current_quantity' => 20,
        ]);

        // Restock adjustment (to 30)
        $restockPayload = [
            'new_quantity' => 30,
            'transaction_type' => 'purchase',
            'reason' => 'Quarterly restock delivered',
        ];

        $response = $this->actingAs($this->doctorUser)
            ->post(route('admin.inventory.adjust', $batch), $restockPayload);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $batch->refresh();
        $this->assertEquals(30, $batch->current_quantity);

        $this->assertDatabaseHas('stock_transactions', [
            'medicine_batch_id' => $batch->id,
            'transaction_type' => 'purchase',
            'quantity' => 10,
            'balance_after' => 30,
            'notes' => 'Quarterly restock delivered',
        ]);

        // Wastage adjustment (from 30 to 25)
        $wastagePayload = [
            'new_quantity' => 25,
            'transaction_type' => 'wastage',
            'reason' => 'Broken bottle during handling',
        ];

        $this->actingAs($this->doctorUser)
            ->post(route('admin.inventory.adjust', $batch), $wastagePayload);

        $batch->refresh();
        $this->assertEquals(25, $batch->current_quantity);

        $this->assertDatabaseHas('stock_transactions', [
            'medicine_batch_id' => $batch->id,
            'transaction_type' => 'wastage',
            'quantity' => -5,
            'balance_after' => 25,
            'notes' => 'Broken bottle during handling',
        ]);
    }

    public function test_authorized_user_can_view_stock_transactions_ledger(): void
    {
        $batch = MedicineBatch::factory()->forRemedy($this->remedy)->create([
            'batch_number' => 'BATCH-HIST-01',
            'current_quantity' => 20,
        ]);

        StockTransaction::create([
            'medicine_batch_id' => $batch->id,
            'transaction_type' => 'purchase',
            'quantity' => 20,
            'balance_after' => 20,
            'performed_by' => $this->doctorUser->id,
        ]);

        $response = $this->actingAs($this->doctorUser)->get(route('admin.inventory.transactions'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Inventory/Transactions')
            ->has('transactions.data', 1)
        );
    }

    public function test_prescription_finalization_auto_deducts_inventory_when_enabled(): void
    {
        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'doctor_name' => 'Dr. Rahman',
            'doctor_credentials' => 'BHMS (DU)',
            'phone' => '01700000000',
            'address' => 'Dhaka',
            'auto_deduct_inventory' => true,
        ]);

        // Create earlier expiring batch and later expiring batch (FIFO)
        $batch1 = MedicineBatch::factory()->forRemedy($this->remedy)->create([
            'batch_number' => 'EARLY-EXP',
            'potency' => '200C',
            'current_quantity' => 10,
            'expiry_date' => now()->addMonths(2),
        ]);

        $batch2 = MedicineBatch::factory()->forRemedy($this->remedy)->create([
            'batch_number' => 'LATER-EXP',
            'potency' => '200C',
            'current_quantity' => 20,
            'expiry_date' => now()->addMonths(12),
        ]);

        $doctor = Doctor::where('user_id', $this->doctorUser->id)->first();
        $patient = Patient::factory()->create();

        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'created_by' => $this->doctorUser->id,
            'status' => 'draft',
        ]);

        // Prescribe remedy
        PrescriptionItem::create([
            'visit_id' => $visit->id,
            'item_type' => 'remedy',
            'medicine_id' => $this->remedy->id,
            'timing' => ['morning', 'night'],
            'before_after' => 'after',
            'dose_qty' => 5,
            'dose_unit' => 'drops',
            'dilution_note' => 'with half cup water',
        ]);

        // Finalize visit
        $response = $this->actingAs($this->doctorUser)
            ->post(route('admin.visits.finalize_draft', $visit), [
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Acute knee pain',
                'status' => 'draft',
            ]);

        $response->assertRedirect();

        $batch1->refresh();
        $batch2->refresh();

        // Earliest batch should be decremented by 1 unit
        $this->assertEquals(9, $batch1->current_quantity);
        $this->assertEquals(20, $batch2->current_quantity);

        // Transaction logged
        $this->assertDatabaseHas('stock_transactions', [
            'medicine_batch_id' => $batch1->id,
            'visit_id' => $visit->id,
            'transaction_type' => 'dispense',
            'quantity' => -1,
            'balance_after' => 9,
        ]);
    }

    public function test_prescription_finalization_does_not_deduct_when_auto_deduct_is_disabled(): void
    {
        ClinicSetting::create([
            'clinic_name_en' => 'RemediQ Health',
            'doctor_name' => 'Dr. Rahman',
            'doctor_credentials' => 'BHMS (DU)',
            'phone' => '01700000000',
            'address' => 'Dhaka',
            'auto_deduct_inventory' => false,
        ]);

        $batch = MedicineBatch::factory()->forRemedy($this->remedy)->create([
            'current_quantity' => 10,
        ]);

        $doctor = Doctor::where('user_id', $this->doctorUser->id)->first();
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'created_by' => $this->doctorUser->id,
            'status' => 'draft',
        ]);

        PrescriptionItem::create([
            'visit_id' => $visit->id,
            'item_type' => 'remedy',
            'medicine_id' => $this->remedy->id,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 5,
            'dose_unit' => 'drops',
            'dilution_note' => 'with water',
        ]);

        $this->actingAs($this->doctorUser)
            ->post(route('admin.visits.finalize_draft', $visit), [
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Checkup',
                'status' => 'draft',
            ]);

        $batch->refresh();
        $this->assertEquals(10, $batch->current_quantity);
        $this->assertDatabaseMissing('stock_transactions', [
            'visit_id' => $visit->id,
        ]);
    }

    public function test_unauthorized_user_cannot_access_inventory(): void
    {
        $response = $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.inventory.index'));

        $response->assertForbidden();

        $postResponse = $this->actingAs($this->unauthorizedUser)
            ->post(route('admin.inventory.store'), [
                'item_type' => 'remedy',
                'medicine_id' => $this->remedy->id,
                'batch_number' => 'UNAUTH-01',
                'initial_quantity' => 10,
            ]);

        $postResponse->assertForbidden();
    }
}
