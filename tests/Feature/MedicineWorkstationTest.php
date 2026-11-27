<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MedicineWorkstationTest extends TestCase
{
    use RefreshDatabase;

    private User $authorizedUser;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('medicines.view', 'web');
        Permission::findOrCreate('medicines.create', 'web');
        Permission::findOrCreate('medicines.update', 'web');
        Permission::findOrCreate('medicines.delete', 'web');

        $role = Role::findOrCreate('Pharmacist', 'web');
        $role->givePermissionTo(['medicines.view', 'medicines.create', 'medicines.update', 'medicines.delete']);

        $this->authorizedUser = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $this->authorizedUser->assignRole($role);
    }

    public function test_authenticated_staff_with_view_permission_can_view_medicines_index_with_kpis(): void
    {
        Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '30C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        Medicine::create([
            'name' => 'Nux Vomica',
            'potency' => '0/1',
            'form' => 'liquid',
            'is_active' => true,
        ]);

        Medicine::create([
            'name' => 'Bryonia Alba',
            'potency' => '6X',
            'form' => 'pills',
            'is_active' => true,
        ]);

        Medicine::create([
            'name' => 'Calendula',
            'potency' => 'Q',
            'form' => 'liquid',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedUser)
            ->get(route('admin.medicines.index'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Medicines/Index')
                ->has('medicines.data', 4)
                ->has('filters')
                ->has('availableForms')
                ->has('kpis', fn (Assert $kpi) => $kpi
                    ->where('total_remedies', 4)
                    ->where('ch_count', 1)
                    ->where('lm_count', 1)
                    ->where('x_count', 1)
                    ->where('mother_tincture_count', 1)
                    ->has('in_stock_count')
                )
            );
    }

    public function test_medicines_index_can_filter_by_search_query(): void
    {
        Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '200C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        Medicine::create([
            'name' => 'Belladonna',
            'potency' => '30C',
            'form' => 'pills',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedUser)
            ->get(route('admin.medicines.index', ['search' => 'Arnica']));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Medicines/Index')
                ->has('medicines.data', 1)
                ->where('medicines.data.0.name', 'Arnica Montana')
            );
    }

    public function test_medicines_index_can_filter_by_potency_scale(): void
    {
        Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '30C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        Medicine::create([
            'name' => 'Thuja Occidentalis',
            'potency' => '0/3',
            'form' => 'liquid',
            'is_active' => true,
        ]);

        // Filter Centesimal (CH)
        $responseCh = $this->actingAs($this->authorizedUser)
            ->get(route('admin.medicines.index', ['scale' => 'ch']));

        $responseCh->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Medicines/Index')
                ->has('medicines.data', 1)
                ->where('medicines.data.0.name', 'Arnica Montana')
            );

        // Filter 50-Millesimal (LM)
        $responseLm = $this->actingAs($this->authorizedUser)
            ->get(route('admin.medicines.index', ['scale' => 'lm']));

        $responseLm->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Medicines/Index')
                ->has('medicines.data', 1)
                ->where('medicines.data.0.name', 'Thuja Occidentalis')
            );
    }

    public function test_medicines_index_can_filter_by_formulation(): void
    {
        Medicine::create([
            'name' => 'Pulsatilla',
            'potency' => '30C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        Medicine::create([
            'name' => 'Rhus Tox',
            'potency' => '200C',
            'form' => 'pills',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedUser)
            ->get(route('admin.medicines.index', ['form' => 'pills']));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Medicines/Index')
                ->has('medicines.data', 1)
                ->where('medicines.data.0.name', 'Rhus Tox')
            );
    }

    public function test_medicines_can_be_exported_as_csv(): void
    {
        Medicine::create([
            'name' => 'Lycopodium',
            'potency' => '1M',
            'form' => 'drops',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedUser)
            ->get(route('admin.medicines.export'));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
        $this->assertStringContainsString('homeopathic-medicines-catalog-', (string) $response->headers->get('content-disposition'));

        $content = $response->streamedContent();
        $this->assertStringContainsString('Remedy Name', $content);
        $this->assertStringContainsString('Lycopodium', $content);
        $this->assertStringContainsString('1M', $content);
    }

    public function test_medicine_can_be_soft_deactivated(): void
    {
        $medicine = Medicine::create([
            'name' => 'Aconite',
            'potency' => '30C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->authorizedUser)
            ->delete(route('admin.medicines.destroy', $medicine->id));

        $response->assertRedirect(route('admin.medicines.index'));
        $this->assertFalse($medicine->fresh()->is_active);
    }

    public function test_unauthorized_staff_cannot_access_medicines_index(): void
    {
        $role = Role::findOrCreate('GuestStaff', 'web');
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        $this->actingAs($user)
            ->get(route('admin.medicines.index'))
            ->assertForbidden();
    }
}
