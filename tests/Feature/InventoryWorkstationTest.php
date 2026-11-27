<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Pharmaceutical;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InventoryWorkstationTest extends TestCase
{
    use RefreshDatabase;

    private User $authorizedPharmacist;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('inventory.view', 'web');
        Permission::findOrCreate('inventory.create', 'web');
        Permission::findOrCreate('inventory.update', 'web');
        Permission::findOrCreate('inventory.delete', 'web');

        $role = Role::findOrCreate('Pharmacist', 'web');
        $role->givePermissionTo(['inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete']);

        $this->authorizedPharmacist = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $this->authorizedPharmacist->assignRole($role);
    }

    public function test_authorized_staff_can_view_inventory_workstation_with_metrics(): void
    {
        $med = Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '200C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        MedicineBatch::create([
            'medicine_id' => $med->id,
            'item_type' => 'remedy',
            'batch_number' => 'ARN-2026-01',
            'current_quantity' => 50,
            'initial_quantity' => 50,
            'reorder_level' => 10,
            'purchase_price' => 120.00,
            'selling_price' => 180.00,
            'expiry_date' => now()->addMonths(6),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedPharmacist)
            ->get(route('admin.inventory.index'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Inventory/Index')
                ->has('batches.data', 1)
                ->has('filters')
                ->has('metrics')
            );
    }

    public function test_unauthorized_user_cannot_view_inventory(): void
    {
        $unauthorized = User::factory()->create(['is_active' => true, 'must_change_password' => false]);

        $this->actingAs($unauthorized)
            ->get(route('admin.inventory.index'))
            ->assertForbidden();
    }

    public function test_inventory_search_filters_by_batch_or_item_name(): void
    {
        $med1 = Medicine::create(['name' => 'Bryonia Alba', 'potency' => '30C', 'form' => 'pills', 'is_active' => true]);
        $med2 = Medicine::create(['name' => 'Rhus Tox', 'potency' => '200C', 'form' => 'drops', 'is_active' => true]);

        MedicineBatch::create([
            'medicine_id' => $med1->id,
            'item_type' => 'remedy',
            'batch_number' => 'BRY-9988',
            'current_quantity' => 20,
            'initial_quantity' => 20,
            'reorder_level' => 5,
            'purchase_price' => 100.00,
            'selling_price' => 150.00,
            'is_active' => true,
        ]);

        MedicineBatch::create([
            'medicine_id' => $med2->id,
            'item_type' => 'remedy',
            'batch_number' => 'RHUS-1122',
            'current_quantity' => 15,
            'initial_quantity' => 15,
            'reorder_level' => 5,
            'purchase_price' => 100.00,
            'selling_price' => 150.00,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedPharmacist)
            ->get(route('admin.inventory.index', ['search' => 'Bryonia']));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Inventory/Index')
                ->has('batches.data', 1)
                ->where('batches.data.0.batch_number', 'BRY-9988')
            );
    }

    public function test_inventory_fefo_sorting_orders_by_earliest_expiry_first(): void
    {
        $med = Medicine::create(['name' => 'Thuja Occidentalis', 'potency' => '1M', 'form' => 'liquid', 'is_active' => true]);

        MedicineBatch::create([
            'medicine_id' => $med->id,
            'item_type' => 'remedy',
            'batch_number' => 'THUJA-FAR',
            'current_quantity' => 20,
            'initial_quantity' => 20,
            'reorder_level' => 5,
            'purchase_price' => 100.00,
            'selling_price' => 150.00,
            'expiry_date' => now()->addDays(200),
            'is_active' => true,
        ]);

        MedicineBatch::create([
            'medicine_id' => $med->id,
            'item_type' => 'remedy',
            'batch_number' => 'THUJA-SOON',
            'current_quantity' => 10,
            'initial_quantity' => 10,
            'reorder_level' => 5,
            'purchase_price' => 100.00,
            'selling_price' => 150.00,
            'expiry_date' => now()->addDays(15),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedPharmacist)
            ->get(route('admin.inventory.index', ['sort' => 'expiry_asc']));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Inventory/Index')
                ->where('batches.data.0.batch_number', 'THUJA-SOON')
                ->where('batches.data.1.batch_number', 'THUJA-FAR')
            );
    }

    public function test_inventory_stocktake_csv_export_streams_correct_data(): void
    {
        $pharma = Pharmaceutical::create([
            'brand_name' => 'Napa Extra',
            'generic_name' => 'Paracetamol + Caffeine',
            'strength' => '500mg+65mg',
            'dosage_form' => 'Tablet',
            'manufacturer' => 'Beximco Pharma',
            'is_active' => true,
        ]);

        MedicineBatch::create([
            'pharmaceutical_id' => $pharma->id,
            'item_type' => 'pharmaceutical',
            'batch_number' => 'NAPA-EX-101',
            'supplier_name' => 'Beximco Central Depot',
            'current_quantity' => 100,
            'initial_quantity' => 100,
            'reorder_level' => 20,
            'purchase_price' => 2.50,
            'selling_price' => 3.50,
            'expiry_date' => now()->addYear(),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedPharmacist)
            ->get(route('admin.inventory.export'));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('attachment; filename="pharmacy-stocktake-audit-', (string) $response->headers->get('Content-Disposition'));

        $streamedContent = $response->streamedContent();
        $this->assertStringContainsString('NAPA-EX-101', $streamedContent);
        $this->assertStringContainsString('Napa Extra', $streamedContent);
        $this->assertStringContainsString('Conventional Pharmaceutical', $streamedContent);
    }

    public function test_authorized_pharmacist_can_adjust_stock_quantity(): void
    {
        $med = Medicine::create(['name' => 'Hypericum', 'potency' => '200C', 'form' => 'drops', 'is_active' => true]);

        $batch = MedicineBatch::create([
            'medicine_id' => $med->id,
            'item_type' => 'remedy',
            'batch_number' => 'HYP-01',
            'current_quantity' => 25,
            'initial_quantity' => 25,
            'reorder_level' => 5,
            'purchase_price' => 110.00,
            'selling_price' => 160.00,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedPharmacist)
            ->post(route('admin.inventory.adjust', $batch->id), [
                'new_quantity' => 20,
                'transaction_type' => 'wastage',
                'reason' => 'Vial broken during transit audit',
            ]);

        $response->assertSessionHas('success');
        $this->assertSame(20.0, (float) $batch->fresh()->current_quantity);
    }
}
