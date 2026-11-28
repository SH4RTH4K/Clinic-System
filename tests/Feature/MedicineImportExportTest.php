<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MedicineImportExportTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    private User $unauthorizedUser;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'medicines.view',
            'medicines.create',
            'medicines.update',
            'medicines.delete',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $adminRole->givePermissionTo($permissions);

        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->adminUser = User::factory()->create([
            'email' => 'admin@remediq.test',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->adminUser->assignRole($adminRole);

        $this->unauthorizedUser = User::factory()->create([
            'email' => 'staff@remediq.test',
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    public function test_unauthenticated_user_cannot_access_import_or_export(): void
    {
        $this->get(route('admin.medicines.export'))->assertRedirect(route('login'));
        $this->get(route('admin.medicines.import_template'))->assertRedirect(route('login'));
        $this->post(route('admin.medicines.import'))->assertRedirect(route('login'));
    }

    public function test_user_without_permission_cannot_access_import_or_export(): void
    {
        $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.medicines.export'))
            ->assertForbidden();

        $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.medicines.import_template'))
            ->assertForbidden();

        $this->actingAs($this->unauthorizedUser)
            ->post(route('admin.medicines.import'))
            ->assertForbidden();
    }

    public function test_authorized_user_can_download_csv_template(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.medicines.import_template'));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $response->assertHeader('Content-Disposition', 'attachment; filename="medicines-import-template.csv"');
    }

    public function test_authorized_user_can_export_medicines_csv(): void
    {
        Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '30C',
            'form' => 'drops',
            'default_instruction' => '5 drops in water',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.medicines.export'));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    public function test_import_csv_with_skip_duplicate_strategy_preserves_existing_data(): void
    {
        // Pre-existing remedy in database
        Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '30C',
            'form' => 'drops',
            'default_instruction' => 'Original instruction',
            'is_active' => true,
        ]);

        $csvContent = implode("\n", [
            'Name,Potency,Form,Default Instruction,Is Active',
            'Arnica Montana,30C,pills,Overwritten instruction attempt,0',
            'Thuja Occidentalis,200C,pills,New remedy instruction,1',
        ]);

        $file = UploadedFile::fake()->createWithContent('medicines.csv', $csvContent);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.medicines.import'), [
                'file' => $file,
                'duplicate_strategy' => 'skip',
            ]);

        $response->assertRedirect(route('admin.medicines.index'));
        $response->assertSessionHas('success');

        // Existing remedy must remain UNCHANGED
        $arnica = Medicine::where('name', 'Arnica Montana')->where('potency', '30C')->firstOrFail();
        $this->assertSame('drops', $arnica->form);
        $this->assertSame('Original instruction', $arnica->default_instruction);
        $this->assertTrue($arnica->is_active);

        // New remedy must be CREATED
        $thuja = Medicine::where('name', 'Thuja Occidentalis')->where('potency', '200C')->first();
        $this->assertNotNull($thuja);
        $this->assertSame('pills', $thuja->form);
        $this->assertSame(2, Medicine::count());
    }

    public function test_import_csv_with_update_duplicate_strategy_updates_existing_data(): void
    {
        // Pre-existing remedy in database
        Medicine::create([
            'name' => 'Nux Vomica',
            'potency' => '30C',
            'form' => 'drops',
            'default_instruction' => 'Old dose',
            'is_active' => false,
        ]);

        $csvContent = implode("\n", [
            'Name,Potency,Form,Default Instruction,Is Active',
            'Nux Vomica,30C,liquid,Updated dose at bedtime,1',
            'Bryonia Alba,200C,drops,Twice daily,1',
        ]);

        $file = UploadedFile::fake()->createWithContent('medicines.csv', $csvContent);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.medicines.import'), [
                'file' => $file,
                'duplicate_strategy' => 'update',
            ]);

        $response->assertRedirect(route('admin.medicines.index'));
        $response->assertSessionHas('success');

        // Existing remedy must be UPDATED
        $nux = Medicine::where('name', 'Nux Vomica')->where('potency', '30C')->firstOrFail();
        $this->assertSame('liquid', $nux->form);
        $this->assertSame('Updated dose at bedtime', $nux->default_instruction);
        $this->assertTrue($nux->is_active);

        // New remedy also created
        $this->assertDatabaseHas('medicines', ['name' => 'Bryonia Alba', 'potency' => '200C']);
        $this->assertSame(2, Medicine::count());
    }

    public function test_import_json_catalog_successfully_imports_records(): void
    {
        $jsonData = json_encode([
            [
                'name' => 'Sulphur',
                'potency' => '0/1',
                'form' => 'pills',
                'default_instruction' => 'Morning dose',
                'is_active' => true,
            ],
            [
                'name' => 'Lycopodium Clavatum',
                'potency' => '1M',
                'form' => 'drops',
                'default_instruction' => 'Weekly dose',
                'is_active' => true,
            ],
        ], JSON_THROW_ON_ERROR);

        $file = UploadedFile::fake()->createWithContent('medicines.json', $jsonData);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.medicines.import'), [
                'file' => $file,
                'duplicate_strategy' => 'skip',
            ]);

        $response->assertRedirect(route('admin.medicines.index'));
        $this->assertDatabaseHas('medicines', ['name' => 'Sulphur', 'potency' => '0/1']);
        $this->assertDatabaseHas('medicines', ['name' => 'Lycopodium Clavatum', 'potency' => '1M']);
        $this->assertSame(2, Medicine::count());
    }

    public function test_import_requires_file_and_valid_strategy(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.medicines.import'), [
                'duplicate_strategy' => 'invalid_strategy',
            ]);

        $response->assertSessionHasErrors(['file', 'duplicate_strategy']);
    }
}
