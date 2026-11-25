<?php

namespace Tests\Feature;

use App\Models\MedicineBatch;
use App\Models\Pharmaceutical;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PharmaceuticalCatalogTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $doctor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();

        $permissions = [
            'pharmaceuticals.view',
            'pharmaceuticals.create',
            'pharmaceuticals.update',
            'pharmaceuticals.delete',
            'inventory.view',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdminRole->syncPermissions(Permission::all());

        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctorRole->syncPermissions(Permission::all());

        $this->superAdmin = User::factory()->create([
            'username' => 'superadmin',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->superAdmin->assignRole($superAdminRole);

        $this->doctor = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->doctor->assignRole($doctorRole);
    }

    public function test_super_admin_and_doctor_can_view_pharmaceuticals_index_with_stock_sum(): void
    {
        $drug = Pharmaceutical::create([
            'brand_name' => 'Napa Extra',
            'generic_name' => 'Paracetamol + Caffeine',
            'dosage_form' => 'Tablet',
            'strength' => '500mg + 65mg',
            'manufacturer' => 'Beximco Pharmaceuticals Ltd',
            'is_active' => true,
        ]);

        MedicineBatch::create([
            'item_type' => 'pharmaceutical',
            'pharmaceutical_id' => $drug->id,
            'batch_number' => 'BATCH-TEST-001',
            'form' => 'tablet',
            'potency' => '500mg + 65mg',
            'expiry_date' => now()->addYear()->toDateString(),
            'purchase_date' => now()->toDateString(),
            'purchase_price' => 20.00,
            'selling_price' => 25.00,
            'initial_quantity' => 150,
            'current_quantity' => 150,
            'unit' => 'Strip',
            'reorder_level' => 10,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->doctor)->get(route('admin.pharmaceuticals.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Pharmaceuticals/Index')
                ->has('pharmaceuticals.data', 1)
                ->where('pharmaceuticals.data.0.brand_name', 'Napa Extra')
                ->where('pharmaceuticals.data.0.total_stock', 150)
                ->where('pharmaceuticals.data.0.active_batches_count', 1)
                ->has('availableDosageForms')
            );
    }

    public function test_pharmaceutical_multi_parameter_search_matches_by_strength_and_brand(): void
    {
        Pharmaceutical::create([
            'brand_name' => 'Napa',
            'generic_name' => 'Paracetamol',
            'dosage_form' => 'Tablet',
            'strength' => '500mg',
            'manufacturer' => 'Beximco',
            'is_active' => true,
        ]);

        Pharmaceutical::create([
            'brand_name' => 'Seclo',
            'generic_name' => 'Omeprazole',
            'dosage_form' => 'Capsule',
            'strength' => '20mg',
            'manufacturer' => 'Square',
            'is_active' => true,
        ]);

        // Search by strength "500mg"
        $response = $this->actingAs($this->doctor)->get(route('admin.pharmaceuticals.index', ['search' => '500mg']));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('pharmaceuticals.data', 1)
                ->where('pharmaceuticals.data.0.brand_name', 'Napa')
            );

        // Search by manufacturer "Square"
        $responseSquare = $this->actingAs($this->doctor)->get(route('admin.pharmaceuticals.index', ['search' => 'Square']));
        $responseSquare->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('pharmaceuticals.data', 1)
                ->where('pharmaceuticals.data.0.brand_name', 'Seclo')
            );
    }

    public function test_pharmaceutical_dosage_form_filter(): void
    {
        Pharmaceutical::create([
            'brand_name' => 'Napa Syrup',
            'generic_name' => 'Paracetamol',
            'dosage_form' => 'Syrup',
            'strength' => '120mg/5ml',
            'is_active' => true,
        ]);

        Pharmaceutical::create([
            'brand_name' => 'Napa Tablet',
            'generic_name' => 'Paracetamol',
            'dosage_form' => 'Tablet',
            'strength' => '500mg',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->doctor)->get(route('admin.pharmaceuticals.index', ['dosage_form' => 'Syrup']));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('pharmaceuticals.data', 1)
                ->where('pharmaceuticals.data.0.dosage_form', 'Syrup')
            );
    }

    public function test_pharmaceutical_csv_export(): void
    {
        Pharmaceutical::create([
            'brand_name' => 'Moxacil',
            'generic_name' => 'Amoxicillin',
            'dosage_form' => 'Capsule',
            'strength' => '500mg',
            'manufacturer' => 'Square Pharmaceuticals Ltd',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->doctor)->get(route('admin.pharmaceuticals.export'));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('content-type'));
        $content = $response->streamedContent();
        $this->assertStringContainsString('Moxacil', $content);
        $this->assertStringContainsString('Amoxicillin', $content);
    }

    public function test_pharmaceutical_store_with_atomic_initial_batch_intake(): void
    {
        $response = $this->actingAs($this->doctor)->post(route('admin.pharmaceuticals.store'), [
            'brand_name' => 'Alatrol',
            'generic_name' => 'Cetirizine Hydrochloride',
            'dosage_form' => 'Tablet',
            'strength' => '10mg',
            'manufacturer' => 'Square Pharmaceuticals Ltd',
            'description' => 'For allergic rhinitis',
            'is_active' => true,

            // Opening batch intake
            'receive_initial_batch' => true,
            'batch_number' => 'BATCH-ALATROL-101',
            'expiry_date' => now()->addMonths(18)->toDateString(),
            'purchase_price' => 30.00,
            'selling_price' => 40.00,
            'initial_quantity' => 200,
            'unit' => 'Strip',
            'reorder_level' => 15,
        ]);

        $response->assertRedirect(route('admin.pharmaceuticals.index'));

        $this->assertDatabaseHas('pharmaceuticals', [
            'brand_name' => 'Alatrol',
            'generic_name' => 'Cetirizine Hydrochloride',
        ]);

        $drug = Pharmaceutical::where('brand_name', 'Alatrol')->firstOrFail();

        $this->assertDatabaseHas('medicine_batches', [
            'item_type' => 'pharmaceutical',
            'pharmaceutical_id' => $drug->id,
            'batch_number' => 'BATCH-ALATROL-101',
            'current_quantity' => 200,
        ]);

        $this->assertDatabaseHas('stock_transactions', [
            'transaction_type' => 'purchase',
            'quantity' => 200,
        ]);
    }

    public function test_pharmaceutical_destroy_performs_safe_deactivation_when_batches_exist(): void
    {
        $drug = Pharmaceutical::create([
            'brand_name' => 'Progut',
            'generic_name' => 'Domperidone',
            'dosage_form' => 'Tablet',
            'strength' => '10mg',
            'is_active' => true,
        ]);

        MedicineBatch::create([
            'item_type' => 'pharmaceutical',
            'pharmaceutical_id' => $drug->id,
            'batch_number' => 'PROGUT-BATCH-01',
            'form' => 'tablet',
            'potency' => '10mg',
            'current_quantity' => 50,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->superAdmin)->delete(route('admin.pharmaceuticals.destroy', $drug));

        $response->assertRedirect(route('admin.pharmaceuticals.index'));

        // Assert drug was NOT hard deleted, but soft-deactivated
        $this->assertDatabaseHas('pharmaceuticals', [
            'id' => $drug->id,
            'is_active' => false,
        ]);

        // Assert batch was PRESERVED
        $this->assertDatabaseHas('medicine_batches', [
            'pharmaceutical_id' => $drug->id,
            'batch_number' => 'PROGUT-BATCH-01',
        ]);
    }
}
