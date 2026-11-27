<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\Symptom;
use App\Models\SymptomMedicineMap;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SymptomManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $permissions = [
            'symptoms.view',
            'symptoms.create',
            'symptoms.update',
            'symptoms.delete',
            'clinical_records.view',
            'visits.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        $role->givePermissionTo($permissions);

        $this->admin = User::factory()->create(['is_active' => true]);
        $this->admin->assignRole('Super Admin');
    }

    public function test_authorized_user_can_view_symptoms_directory_with_kpi_metrics(): void
    {
        $symptom = Symptom::create([
            'name_en' => 'Anxiety with restless tossing',
            'code' => 'MIND-01',
            'name_bn' => 'মৃত্যুভয় ও ছটফটানি',
            'category' => 'mind',
            'modalities' => '< Midnight; > Warmth',
            'is_active' => true,
        ]);

        $medicine = Medicine::create([
            'name' => 'Aconitum Napellus',
            'potency' => '30C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        SymptomMedicineMap::create([
            'symptom_id' => $symptom->id,
            'medicine_id' => $medicine->id,
            'priority' => 1,
            'review_status' => 'approved',
            'is_approved' => true,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.symptoms.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Symptoms/Index')
                ->has('symptoms.data')
                ->has('metrics')
                ->where('metrics.total', 1)
                ->where('metrics.active', 1)
                ->where('metrics.mapped', 1)
                ->where('metrics.unmapped', 0)
            );
    }

    public function test_filtering_symptoms_by_repertory_chapter_and_mapping(): void
    {
        $mindSymptom = Symptom::create([
            'name_en' => 'Restlessness',
            'code' => 'MIND-01',
            'category' => 'mind',
            'is_active' => true,
        ]);

        $stomachSymptom = Symptom::create([
            'name_en' => 'Thirst for cold water',
            'code' => 'DIG-01',
            'category' => 'digestion',
            'is_active' => true,
        ]);

        $medicine = Medicine::create([
            'name' => 'Bryonia Alba',
            'potency' => '200C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        SymptomMedicineMap::create([
            'symptom_id' => $stomachSymptom->id,
            'medicine_id' => $medicine->id,
            'priority' => 1,
            'review_status' => 'approved',
            'is_approved' => true,
        ]);

        // Filter by Chapter
        $chapResponse = $this->actingAs($this->admin)->get(route('admin.symptoms.index', ['category' => 'mind']));
        $chapResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('symptoms.data', 1)
                ->where('symptoms.data.0.code', 'MIND-01')
            );

        // Filter by Mapped Status
        $mappedResponse = $this->actingAs($this->admin)->get(route('admin.symptoms.index', ['mapped' => 'mapped']));
        $mappedResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('symptoms.data', 1)
                ->where('symptoms.data.0.code', 'DIG-01')
            );
    }

    public function test_debounced_search_matches_english_bengali_and_modalities(): void
    {
        Symptom::create([
            'name_en' => 'Throbbing congestive headache',
            'code' => 'HEAD-01',
            'name_bn' => 'দপদপানি মাথাব্যথা',
            'category' => 'head',
            'modalities' => '< Light and noise; > Dark room',
            'is_active' => true,
        ]);

        // Search by English Name
        $enResponse = $this->actingAs($this->admin)->get(route('admin.symptoms.index', ['search' => 'Throbbing']));
        $enResponse->assertOk()
            ->assertInertia(fn ($page) => $page->has('symptoms.data', 1));

        // Search by Bengali Name
        $bnResponse = $this->actingAs($this->admin)->get(route('admin.symptoms.index', ['search' => 'দপদপানি']));
        $bnResponse->assertOk()
            ->assertInertia(fn ($page) => $page->has('symptoms.data', 1));

        // Search by Modalities
        $modResponse = $this->actingAs($this->admin)->get(route('admin.symptoms.index', ['search' => 'Dark room']));
        $modResponse->assertOk()
            ->assertInertia(fn ($page) => $page->has('symptoms.data', 1));
    }

    public function test_authorized_user_can_access_create_form(): void
    {
        $response = $this->actingAs($this->admin)->get(route('admin.symptoms.create'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Symptoms/Create')
            );
    }

    public function test_authorized_user_can_create_symptom_rubric_with_modalities(): void
    {
        $payload = [
            'name_en' => 'Early morning diarrhea at 5 AM',
            'code' => 'ABD-02',
            'name_bn' => 'ভোরবেলা বিছানা ত্যাগে বাধ্যকারী ডায়রিয়া',
            'category' => 'abdomen_stool',
            'modalities' => '< 5 AM, warmth of bed; > Dry warm weather',
            'is_active' => true,
        ];

        $response = $this->actingAs($this->admin)
            ->post(route('admin.symptoms.store'), $payload);

        $response->assertRedirect(route('admin.symptoms.index'));

        $this->assertDatabaseHas('symptoms', [
            'name_en' => 'Early morning diarrhea at 5 AM',
            'code' => 'ABD-02',
            'category' => 'abdomen_stool',
        ]);
    }

    public function test_authorized_user_can_edit_and_update_symptom(): void
    {
        $symptom = Symptom::create([
            'name_en' => 'Old Rubric Name',
            'code' => 'OLD-01',
            'category' => 'other',
            'is_active' => true,
        ]);

        $editResponse = $this->actingAs($this->admin)
            ->get(route('admin.symptoms.edit', $symptom->id));

        $editResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Symptoms/Edit')
                ->where('symptom.name_en', 'Old Rubric Name')
            );

        $updateResponse = $this->actingAs($this->admin)
            ->put(route('admin.symptoms.update', $symptom->id), [
                'name_en' => 'Updated Rubric Name',
                'code' => 'NEW-01',
                'name_bn' => 'হালনাগাদ রুব্রিক',
                'category' => 'mind',
                'modalities' => '< Motion; > Rest',
                'is_active' => true,
            ]);

        $updateResponse->assertRedirect(route('admin.symptoms.index'));

        $this->assertDatabaseHas('symptoms', [
            'id' => $symptom->id,
            'name_en' => 'Updated Rubric Name',
            'code' => 'NEW-01',
            'category' => 'mind',
        ]);
    }

    public function test_deactivating_symptom_when_linked_to_mappings(): void
    {
        $symptom = Symptom::create([
            'name_en' => 'Symptom with mappings',
            'code' => 'SYM-01',
            'category' => 'skin',
            'is_active' => true,
        ]);

        $medicine = Medicine::create([
            'name' => 'Sulphur',
            'potency' => '200C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        SymptomMedicineMap::create([
            'symptom_id' => $symptom->id,
            'medicine_id' => $medicine->id,
            'priority' => 1,
            'review_status' => 'approved',
            'is_approved' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->delete(route('admin.symptoms.destroy', $symptom->id));

        $response->assertRedirect(route('admin.symptoms.index'));
        $this->assertDatabaseHas('symptoms', ['id' => $symptom->id, 'is_active' => false]);
    }

    public function test_unlinked_symptom_is_removed_on_delete(): void
    {
        $symptom = Symptom::create([
            'name_en' => 'Unlinked symptom to delete',
            'code' => 'DEL-01',
            'category' => 'other',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->delete(route('admin.symptoms.destroy', $symptom->id));

        $response->assertRedirect(route('admin.symptoms.index'));
        $this->assertDatabaseMissing('symptoms', ['id' => $symptom->id]);
    }

    public function test_repertorization_suggestion_endpoint_returns_ranked_remedies(): void
    {
        $symptom = Symptom::create([
            'name_en' => 'Joint pain better motion',
            'code' => 'EXT-01',
            'category' => 'extremities',
            'is_active' => true,
        ]);

        $rhusTox = Medicine::create([
            'name' => 'Rhus Toxicodendron',
            'potency' => '200C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        SymptomMedicineMap::create([
            'symptom_id' => $symptom->id,
            'medicine_id' => $rhusTox->id,
            'priority' => 1,
            'review_status' => 'approved',
            'is_approved' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson(route('admin.visits.suggestions', ['symptoms' => [$symptom->id]]));

        $response->assertOk()
            ->assertJsonFragment([
                'medicine_id' => $rhusTox->id,
                'medicine_name' => 'Rhus Toxicodendron',
                'reference_match_count' => 1,
                'best_priority' => 1,
            ]);
    }

    public function test_unauthorized_user_without_permission_is_forbidden(): void
    {
        $unauthorized = User::factory()->create(['is_active' => true]);

        $response = $this->actingAs($unauthorized)
            ->post(route('admin.symptoms.store'), [
                'name_en' => 'Forbidden Rubric',
            ]);

        $response->assertForbidden();
    }
}
