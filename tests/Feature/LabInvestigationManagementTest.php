<?php

namespace Tests\Feature;

use App\Models\LabInvestigation;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitLabInvestigation;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LabInvestigationManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $permissions = [
            'lab_investigations.view',
            'lab_investigations.create',
            'lab_investigations.update',
            'lab_investigations.delete',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        $role->givePermissionTo($permissions);

        $this->admin = User::factory()->create(['is_active' => true]);
        $this->admin->assignRole('Super Admin');
    }

    public function test_authorized_user_can_view_lab_investigations_directory_with_metrics(): void
    {
        LabInvestigation::create([
            'name' => 'Complete Blood Count (CBC)',
            'code' => 'CBC',
            'name_bn' => 'কমপ্লিট ব্লাড কাউন্ট',
            'category' => 'hematology',
            'specimen_type' => 'blood',
            'standard_cost' => 400.00,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.lab_investigations.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/LabInvestigations/Index')
                ->has('labInvestigations.data')
                ->has('metrics')
                ->where('metrics.total', 1)
                ->where('metrics.active', 1)
                ->where('metrics.with_fee', 1)
            );
    }

    public function test_filtering_investigations_by_category_and_specimen(): void
    {
        LabInvestigation::create([
            'name' => 'Complete Blood Count',
            'code' => 'CBC',
            'category' => 'hematology',
            'specimen_type' => 'blood',
            'standard_cost' => 400.00,
            'is_active' => true,
        ]);

        LabInvestigation::create([
            'name' => 'Urine Routine & Microscopic',
            'code' => 'Urine R/M/E',
            'category' => 'microbiology',
            'specimen_type' => 'urine',
            'standard_cost' => 150.00,
            'is_active' => true,
        ]);

        // Filter by category
        $catResponse = $this->actingAs($this->admin)->get(route('admin.lab_investigations.index', ['category' => 'hematology']));
        $catResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('labInvestigations.data', 1)
                ->where('labInvestigations.data.0.code', 'CBC')
            );

        // Filter by specimen
        $specResponse = $this->actingAs($this->admin)->get(route('admin.lab_investigations.index', ['specimen' => 'urine']));
        $specResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('labInvestigations.data', 1)
                ->where('labInvestigations.data.0.code', 'Urine R/M/E')
            );
    }

    public function test_search_matches_name_code_and_bengali_name(): void
    {
        LabInvestigation::create([
            'name' => 'Fasting Blood Sugar',
            'code' => 'FBS',
            'name_bn' => 'ফাস্টিং ব্লাড সুগার',
            'category' => 'biochemistry',
            'specimen_type' => 'blood',
            'standard_cost' => 100.00,
            'is_active' => true,
        ]);

        // Search by Code
        $codeResponse = $this->actingAs($this->admin)->get(route('admin.lab_investigations.index', ['search' => 'FBS']));
        $codeResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('labInvestigations.data', 1)
                ->where('labInvestigations.data.0.name', 'Fasting Blood Sugar')
            );

        // Search by Bengali name
        $bnResponse = $this->actingAs($this->admin)->get(route('admin.lab_investigations.index', ['search' => 'ফাস্টিং']));
        $bnResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('labInvestigations.data', 1)
                ->where('labInvestigations.data.0.code', 'FBS')
            );
    }

    public function test_authorized_user_can_access_create_form(): void
    {
        $response = $this->actingAs($this->admin)->get(route('admin.lab_investigations.create'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/LabInvestigations/Create')
            );
    }

    public function test_authorized_user_can_create_lab_investigation_with_clinical_attributes(): void
    {
        $payload = [
            'name' => 'Lipid Profile (Cholesterol, TG, HDL, LDL)',
            'code' => 'Lipid',
            'name_bn' => 'লিপিড প্রোফাইল',
            'category' => 'biochemistry',
            'specimen_type' => 'blood',
            'standard_cost' => 900.00,
            'default_instructions' => '10-12 hours fasting required.',
            'reference_range' => 'Total Chol < 200 mg/dL',
            'turnaround_time' => '4 Hours',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('admin.lab_investigations.store'), $payload);

        $response->assertRedirect(route('admin.lab_investigations.index'));

        $this->assertDatabaseHas('lab_investigations', [
            'name' => 'Lipid Profile (Cholesterol, TG, HDL, LDL)',
            'code' => 'Lipid',
            'name_bn' => 'লিপিড প্রোফাইল',
            'category' => 'biochemistry',
            'specimen_type' => 'blood',
            'standard_cost' => 900.00,
        ]);
    }

    public function test_authorized_user_can_edit_and_update_investigation(): void
    {
        $test = LabInvestigation::create([
            'name' => 'Old Test',
            'code' => 'OLD',
            'category' => 'other',
            'specimen_type' => 'other',
            'standard_cost' => 50.00,
            'is_active' => true,
        ]);

        $editResponse = $this->actingAs($this->admin)
            ->get(route('admin.lab_investigations.edit', $test->id));

        $editResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/LabInvestigations/Edit')
                ->where('labInvestigation.name', 'Old Test')
            );

        $updateResponse = $this->actingAs($this->admin)
            ->put(route('admin.lab_investigations.update', $test->id), [
                'name' => 'Updated Test',
                'code' => 'NEW',
                'name_bn' => 'নতুন পরীক্ষা',
                'category' => 'biochemistry',
                'specimen_type' => 'blood',
                'standard_cost' => 250.00,
                'default_instructions' => 'Updated instructions',
                'is_active' => true,
            ]);

        $updateResponse->assertRedirect(route('admin.lab_investigations.index'));

        $this->assertDatabaseHas('lab_investigations', [
            'id' => $test->id,
            'name' => 'Updated Test',
            'code' => 'NEW',
            'standard_cost' => 250.00,
        ]);
    }

    public function test_authorized_user_can_delete_investigation(): void
    {
        $test = LabInvestigation::create([
            'name' => 'Test to Delete',
            'category' => 'other',
            'specimen_type' => 'other',
            'standard_cost' => 0.00,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->delete(route('admin.lab_investigations.destroy', $test->id));

        $response->assertRedirect(route('admin.lab_investigations.index'));
        $this->assertDatabaseMissing('lab_investigations', ['id' => $test->id]);
    }

    public function test_investigation_standard_cost_auto_populates_in_billing_service(): void
    {
        $labTest = LabInvestigation::create([
            'name' => 'Complete Blood Count (CBC)',
            'code' => 'CBC',
            'category' => 'hematology',
            'specimen_type' => 'blood',
            'standard_cost' => 450.00,
            'is_active' => true,
        ]);

        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id]);

        VisitLabInvestigation::create([
            'visit_id' => $visit->id,
            'lab_investigation_id' => $labTest->id,
            'test_name' => $labTest->name,
            'instructions' => 'Routine CBC',
            'status' => 'ordered',
        ]);

        $billingService = app(BillingService::class);
        $result = $billingService->buildItemsFromVisit($visit);

        $investigationItem = collect($result['items'])->firstWhere('item_type', 'investigation');

        $this->assertNotNull($investigationItem);
        $this->assertEquals('Complete Blood Count (CBC)', $investigationItem['item_name']);
        $this->assertEquals(450.00, $investigationItem['unit_price']);
        $this->assertEquals(450.00, $investigationItem['total_price']);
        $this->assertStringContainsString('[CBC]', $investigationItem['notes']);
    }

    public function test_search_endpoint_returns_json_results_with_clinical_codes(): void
    {
        LabInvestigation::create([
            'name' => 'Random Blood Sugar (RBS)',
            'code' => 'RBS',
            'name_bn' => 'র‍্যান্ডম ব্লাড সুগার',
            'category' => 'biochemistry',
            'specimen_type' => 'blood',
            'standard_cost' => 120.00,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson(route('admin.lab_investigations.search', ['query' => 'RBS']));

        $response->assertOk()
            ->assertJsonFragment([
                'name' => 'Random Blood Sugar (RBS)',
                'code' => 'RBS',
                'category' => 'biochemistry',
                'specimen_type' => 'blood',
                'standard_cost' => '120.00',
            ]);
    }

    public function test_unauthorized_user_without_permission_is_forbidden(): void
    {
        $unauthorizedUser = User::factory()->create(['is_active' => true]);

        $response = $this->actingAs($unauthorizedUser)
            ->post(route('admin.lab_investigations.store'), [
                'name' => 'Forbidden Test',
                'category' => 'other',
            ]);

        $response->assertForbidden();
    }
}
