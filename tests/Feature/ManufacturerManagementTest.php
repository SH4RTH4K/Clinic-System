<?php

namespace Tests\Feature;

use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ManufacturerManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $doctor;

    private User $unauthorizedUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();

        $permissions = [
            'manufacturers.view',
            'manufacturers.create',
            'manufacturers.update',
            'manufacturers.delete',
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

        $this->unauthorizedUser = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    public function test_authorized_user_can_view_manufacturers_directory(): void
    {
        Manufacturer::create([
            'name' => 'Square Pharmaceuticals Ltd',
            'short_name' => 'Square',
            'name_bn' => 'স্কয়ার',
            'type' => 'allopathic',
            'phone' => '01711000000',
            'is_active' => true,
        ]);

        Manufacturer::create([
            'name' => 'Dr. Willmar Schwabe Germany',
            'short_name' => 'Schwabe',
            'name_bn' => 'শোয়াবে জার্মানি',
            'type' => 'homeopathic',
            'phone' => '01811000000',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('admin.manufacturers.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Manufacturers/Index')
                ->has('manufacturers.data', 2)
                ->has('metrics')
                ->where('metrics.allopathic', 1)
                ->where('metrics.homeopathic', 1)
            );
    }

    public function test_filtering_manufacturers_by_type_and_search(): void
    {
        Manufacturer::create([
            'name' => 'Beximco Pharmaceuticals Ltd',
            'short_name' => 'Beximco',
            'type' => 'allopathic',
            'is_active' => true,
        ]);

        Manufacturer::create([
            'name' => 'SBL Private Limited',
            'short_name' => 'SBL India',
            'type' => 'homeopathic',
            'is_active' => true,
        ]);

        $searchResponse = $this->actingAs($this->doctor)
            ->get(route('admin.manufacturers.index', ['search' => 'Beximco']));

        $searchResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('manufacturers.data', 1)
                ->where('manufacturers.data.0.name', 'Beximco Pharmaceuticals Ltd')
            );

        $typeResponse = $this->actingAs($this->doctor)
            ->get(route('admin.manufacturers.index', ['type' => 'homeopathic']));

        $typeResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('manufacturers.data', 1)
                ->where('manufacturers.data.0.name', 'SBL Private Limited')
            );
    }

    public function test_authorized_user_can_access_create_form(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('admin.manufacturers.create'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Manufacturers/Create')
            );
    }

    public function test_authorized_user_can_create_manufacturer(): void
    {
        $payload = [
            'name' => 'Renata Limited',
            'short_name' => 'Renata',
            'name_bn' => 'রেনাটা লিমিটেড',
            'type' => 'allopathic',
            'contact_person' => 'Kamal Hossain (Area Manager)',
            'phone' => '01712345678',
            'email' => 'sales@renata-ltd.com',
            'address' => 'Mirpur, Dhaka',
            'website' => 'https://www.renata-ltd.com',
            'notes' => 'Weekly Monday deliveries',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->superAdmin)
            ->post(route('admin.manufacturers.store'), $payload);

        $response->assertRedirect(route('admin.manufacturers.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('manufacturers', [
            'name' => 'Renata Limited',
            'short_name' => 'Renata',
            'type' => 'allopathic',
            'contact_person' => 'Kamal Hossain (Area Manager)',
            'is_active' => 1,
        ]);
    }

    public function test_validation_prevents_duplicate_manufacturer_name(): void
    {
        Manufacturer::create([
            'name' => 'Incepta Pharmaceuticals Ltd',
            'type' => 'allopathic',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('admin.manufacturers.store'), [
                'name' => 'Incepta Pharmaceuticals Ltd',
                'type' => 'allopathic',
            ]);

        $response->assertSessionHasErrors(['name']);
    }

    public function test_authorized_user_can_edit_and_update_manufacturer(): void
    {
        $manufacturer = Manufacturer::create([
            'name' => 'Opsonin Pharma',
            'short_name' => 'Opsonin',
            'type' => 'allopathic',
            'is_active' => true,
        ]);

        $editResponse = $this->actingAs($this->doctor)
            ->get(route('admin.manufacturers.edit', $manufacturer->id));

        $editResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Manufacturers/Edit')
                ->where('manufacturer.name', 'Opsonin Pharma')
            );

        $updateResponse = $this->actingAs($this->doctor)
            ->put(route('admin.manufacturers.update', $manufacturer->id), [
                'name' => 'Opsonin Pharma Ltd',
                'short_name' => 'Opsonin',
                'type' => 'allopathic',
                'contact_person' => 'Faruk Ahmed',
                'phone' => '01999888777',
                'is_active' => true,
            ]);

        $updateResponse->assertRedirect(route('admin.manufacturers.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('manufacturers', [
            'id' => $manufacturer->id,
            'name' => 'Opsonin Pharma Ltd',
            'contact_person' => 'Faruk Ahmed',
            'phone' => '01999888777',
        ]);
    }

    public function test_deactivating_manufacturer_sets_is_active_false(): void
    {
        $manufacturer = Manufacturer::create([
            'name' => 'Legacy Homeo Lab',
            'type' => 'homeopathic',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->delete(route('admin.manufacturers.destroy', $manufacturer->id));

        $response->assertRedirect(route('admin.manufacturers.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('manufacturers', [
            'id' => $manufacturer->id,
            'is_active' => 0,
        ]);
    }

    public function test_search_endpoint_returns_json_results(): void
    {
        Manufacturer::create([
            'name' => 'Square Pharmaceuticals Ltd',
            'short_name' => 'Square',
            'type' => 'allopathic',
            'is_active' => true,
        ]);

        Manufacturer::create([
            'name' => 'Inactive Company',
            'short_name' => 'Inactive',
            'type' => 'allopathic',
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->doctor)
            ->getJson(route('admin.manufacturers.search', ['query' => 'Square']));

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'name' => 'Square Pharmaceuticals Ltd',
                'short_name' => 'Square',
            ]);
    }

    public function test_unauthorized_user_without_permissions_is_forbidden(): void
    {
        $indexResponse = $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.manufacturers.index'));
        $indexResponse->assertForbidden();

        $createResponse = $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.manufacturers.create'));
        $createResponse->assertForbidden();

        $storeResponse = $this->actingAs($this->unauthorizedUser)
            ->post(route('admin.manufacturers.store'), [
                'name' => 'Unauthorized Drug Co',
                'type' => 'allopathic',
            ]);
        $storeResponse->assertForbidden();
    }
}
