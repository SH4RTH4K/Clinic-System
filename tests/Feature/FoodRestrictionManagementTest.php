<?php

namespace Tests\Feature;

use App\Models\FoodRestriction;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FoodRestrictionManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $permissions = [
            'food_restrictions.view',
            'food_restrictions.create',
            'food_restrictions.update',
            'food_restrictions.delete',
            'visits.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        $role->givePermissionTo($permissions);

        $this->admin = User::factory()->create(['is_active' => true]);
        $this->admin->assignRole('Super Admin');
    }

    public function test_authorized_user_can_view_food_restrictions_directory_with_kpi_metrics(): void
    {
        FoodRestriction::create([
            'text_bn' => 'কাঁচা পেঁয়াজ ও রসুন সম্পূর্ণ নিষেধ',
            'text_en' => 'Avoid raw onion and garlic',
            'category' => 'homeopathic_antidote',
            'is_default' => true,
            'is_active' => true,
        ]);

        FoodRestriction::create([
            'text_bn' => 'খাবারের সাথে কাঁচা লবণ খাওয়া বন্ধ রাখুন',
            'text_en' => 'Avoid raw added table salt',
            'category' => 'chronic_metabolic',
            'is_default' => true,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.food_restrictions.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/FoodRestrictions/Index')
                ->has('foodRestrictions.data', 2)
                ->where('kpis.total', 2)
                ->where('kpis.default', 2)
                ->where('kpis.antidote', 1)
                ->where('kpis.metabolic', 1)
            );
    }

    public function test_search_filters_food_restrictions_by_bengali_or_english_text(): void
    {
        FoodRestriction::create([
            'text_bn' => 'চিংড়ি মাছ ও কাঁকড়া খাওয়া পরিহার করুন',
            'text_en' => 'Avoid prawns and shrimp',
            'category' => 'allergic_histamine',
            'is_default' => false,
            'is_active' => true,
        ]);

        FoodRestriction::create([
            'text_bn' => 'ফ্রিজের ঠাণ্ডা পানি খাবেন না',
            'text_en' => 'Avoid cold refrigerated water',
            'category' => 'sour_cold',
            'is_default' => false,
            'is_active' => true,
        ]);

        // Search by Bengali text
        $response = $this->actingAs($this->admin)->get(route('admin.food_restrictions.index', ['search' => 'চিংড়ি']));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('foodRestrictions.data', 1)
                ->where('foodRestrictions.data.0.text_bn', 'চিংড়ি মাছ ও কাঁকড়া খাওয়া পরিহার করুন')
            );

        // Search by English text
        $enResponse = $this->actingAs($this->admin)->get(route('admin.food_restrictions.index', ['search' => 'refrigerated']));
        $enResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('foodRestrictions.data', 1)
                ->where('foodRestrictions.data.0.text_bn', 'ফ্রিজের ঠাণ্ডা পানি খাবেন না')
            );
    }

    public function test_category_filter_narrows_food_restrictions(): void
    {
        FoodRestriction::create([
            'text_bn' => 'কর্পূর ও মেন্থল থেকে দূরে থাকুন',
            'text_en' => 'Avoid camphor and menthol',
            'category' => 'homeopathic_antidote',
            'is_default' => true,
            'is_active' => true,
        ]);

        FoodRestriction::create([
            'text_bn' => 'ভাজাপোড়া ও ফাস্টফুড পরিহার করুন',
            'text_en' => 'Avoid fried and fast food',
            'category' => 'spicy_oily',
            'is_default' => false,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.food_restrictions.index', ['category' => 'homeopathic_antidote']));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('foodRestrictions.data', 1)
                ->where('foodRestrictions.data.0.category', 'homeopathic_antidote')
            );
    }

    public function test_default_filter_narrows_food_restrictions(): void
    {
        FoodRestriction::create([
            'text_bn' => 'ডিফল্ট নিষেধ',
            'category' => 'general',
            'is_default' => true,
            'is_active' => true,
        ]);

        FoodRestriction::create([
            'text_bn' => 'ঐচ্ছিক নিষেধ',
            'category' => 'general',
            'is_default' => false,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.food_restrictions.index', ['default' => 'default']));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('foodRestrictions.data', 1)
                ->where('foodRestrictions.data.0.text_bn', 'ডিফল্ট নিষেধ')
            );
    }

    public function test_status_filter_narrows_food_restrictions(): void
    {
        FoodRestriction::create([
            'text_bn' => 'সক্রিয় নিষেধ',
            'category' => 'general',
            'is_default' => false,
            'is_active' => true,
        ]);

        FoodRestriction::create([
            'text_bn' => 'নিষ্ক্রিয় নিষেধ',
            'category' => 'general',
            'is_default' => false,
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.food_restrictions.index', ['status' => 'inactive']));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('foodRestrictions.data', 1)
                ->where('foodRestrictions.data.0.text_bn', 'নিষ্ক্রিয় নিষেধ')
            );
    }

    public function test_authorized_user_can_create_food_restriction(): void
    {
        $payload = [
            'text_bn' => 'তেঁতুল ও আচার খাওয়া নিষেধ',
            'text_en' => 'Avoid tamarind and sour pickles',
            'category' => 'sour_cold',
            'is_default' => true,
            'is_active' => true,
            'sort_order' => 12,
        ];

        $response = $this->actingAs($this->admin)->post(route('admin.food_restrictions.store'), $payload);

        $response->assertRedirect(route('admin.food_restrictions.index'));
        $this->assertDatabaseHas('food_restrictions', [
            'text_bn' => 'তেঁতুল ও আচার খাওয়া নিষেধ',
            'category' => 'sour_cold',
            'is_default' => true,
            'sort_order' => 12,
        ]);
    }

    public function test_validation_enforces_bengali_text(): void
    {
        $response = $this->actingAs($this->admin)->post(route('admin.food_restrictions.store'), [
            'text_bn' => '',
            'text_en' => 'English only without Bengali',
        ]);

        $response->assertSessionHasErrors(['text_bn']);
    }

    public function test_authorized_user_can_update_food_restriction(): void
    {
        $restriction = FoodRestriction::create([
            'text_bn' => 'পুরাতন নিষেধ',
            'text_en' => 'Old restriction',
            'category' => 'general',
            'is_default' => false,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->put(route('admin.food_restrictions.update', $restriction), [
            'text_bn' => 'আপডেটেড পথ্য ও খাদ্য নিষেধ',
            'text_en' => 'Updated restriction guideline',
            'category' => 'homeopathic_antidote',
            'is_default' => true,
            'is_active' => true,
            'sort_order' => 5,
        ]);

        $response->assertRedirect(route('admin.food_restrictions.index'));
        $this->assertDatabaseHas('food_restrictions', [
            'id' => $restriction->id,
            'text_bn' => 'আপডেটেড পথ্য ও খাদ্য নিষেধ',
            'category' => 'homeopathic_antidote',
            'is_default' => true,
            'sort_order' => 5,
        ]);
    }

    public function test_unlinked_food_restriction_can_be_permanently_deleted(): void
    {
        $restriction = FoodRestriction::create([
            'text_bn' => 'মুছে ফেলার যোগ্য নিষেধ',
            'category' => 'general',
        ]);

        $response = $this->actingAs($this->admin)->delete(route('admin.food_restrictions.destroy', $restriction));

        $response->assertRedirect(route('admin.food_restrictions.index'));
        $this->assertDatabaseMissing('food_restrictions', ['id' => $restriction->id]);
    }

    public function test_linked_food_restriction_is_safely_deactivated_instead_of_hard_deleted(): void
    {
        $restriction = FoodRestriction::create([
            'text_bn' => 'প্রেসক্রিপশনে ব্যবহৃত খাদ্য নিষেধ',
            'category' => 'homeopathic_antidote',
            'is_active' => true,
        ]);

        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id]);

        $visit->foodRestrictions()->attach($restriction->id);

        $response = $this->actingAs($this->admin)
            ->from(route('admin.food_restrictions.index'))
            ->delete(route('admin.food_restrictions.destroy', $restriction));

        $response->assertRedirect(route('admin.food_restrictions.index'));
        $response->assertSessionHas('info');

        // Record must NOT be deleted from database, only deactivated!
        $this->assertDatabaseHas('food_restrictions', [
            'id' => $restriction->id,
            'is_active' => false,
        ]);
    }

    public function test_authorized_user_can_toggle_active_status(): void
    {
        $restriction = FoodRestriction::create([
            'text_bn' => 'টগল স্ট্যাটাস টেস্ট',
            'is_active' => true,
            'category' => 'general',
        ]);

        $response = $this->actingAs($this->admin)
            ->from(route('admin.food_restrictions.index'))
            ->patch(route('admin.food_restrictions.toggle-status', $restriction));

        $response->assertRedirect(route('admin.food_restrictions.index'));
        $this->assertDatabaseHas('food_restrictions', [
            'id' => $restriction->id,
            'is_active' => false,
        ]);
    }

    public function test_authorized_user_can_toggle_default_preset(): void
    {
        $restriction = FoodRestriction::create([
            'text_bn' => 'টগল ডিফল্ট টেস্ট',
            'is_default' => false,
            'category' => 'general',
        ]);

        $response = $this->actingAs($this->admin)
            ->from(route('admin.food_restrictions.index'))
            ->patch(route('admin.food_restrictions.toggle-default', $restriction));

        $response->assertRedirect(route('admin.food_restrictions.index'));
        $this->assertDatabaseHas('food_restrictions', [
            'id' => $restriction->id,
            'is_default' => true,
        ]);
    }
}
