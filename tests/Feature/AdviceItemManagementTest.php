<?php

namespace Tests\Feature;

use App\Models\AdviceItem;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdviceItemManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $permissions = [
            'advice_items.view',
            'advice_items.create',
            'advice_items.update',
            'advice_items.delete',
            'visits.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        $role->givePermissionTo($permissions);

        $this->admin = User::factory()->create(['is_active' => true]);
        $this->admin->assignRole('Super Admin');
    }

    public function test_authorized_user_can_view_advice_items_directory_with_kpi_metrics(): void
    {
        AdviceItem::create([
            'text_bn' => 'পর্যাপ্ত পানি পান করুন',
            'text_en' => 'Drink adequate water',
            'category' => 'general',
            'is_default' => true,
            'is_active' => true,
        ]);

        AdviceItem::create([
            'text_bn' => 'ঔষধের ৩০ মিনিট আগে পরে কিছু খাবেন না',
            'text_en' => 'Avoid food 30 min before and after',
            'category' => 'homeopathic',
            'is_default' => true,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.advice_items.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/AdviceItems/Index')
                ->has('adviceItems.data', 2)
                ->where('kpis.total', 2)
                ->where('kpis.default', 2)
                ->where('kpis.homeopathic', 1)
                ->where('kpis.general', 1)
            );
    }

    public function test_search_filters_advice_items_by_bengali_or_english_text(): void
    {
        AdviceItem::create([
            'text_bn' => 'ধূমপান পরিহার করুন',
            'text_en' => 'Avoid smoking completely',
            'category' => 'lifestyle',
            'is_default' => false,
            'is_active' => true,
        ]);

        AdviceItem::create([
            'text_bn' => 'ঠাণ্ডা খাবার খাবেন না',
            'text_en' => 'Avoid cold food',
            'category' => 'diet',
            'is_default' => false,
            'is_active' => true,
        ]);

        // Search by Bengali text
        $response = $this->actingAs($this->admin)->get(route('admin.advice_items.index', ['search' => 'ধূমপান']));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('adviceItems.data', 1)
                ->where('adviceItems.data.0.text_bn', 'ধূমপান পরিহার করুন')
            );

        // Search by English text
        $enResponse = $this->actingAs($this->admin)->get(route('admin.advice_items.index', ['search' => 'smoking']));
        $enResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('adviceItems.data', 1)
                ->where('adviceItems.data.0.text_en', 'Avoid smoking completely')
            );
    }

    public function test_category_filter_returns_only_matching_discipline(): void
    {
        AdviceItem::create([
            'text_bn' => 'হোমিওপ্যাথিক নিয়ম',
            'category' => 'homeopathic',
            'is_default' => true,
        ]);

        AdviceItem::create([
            'text_bn' => 'ডায়েট পরামর্শ',
            'category' => 'diet',
            'is_default' => false,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.advice_items.index', ['category' => 'homeopathic']));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('adviceItems.data', 1)
                ->where('adviceItems.data.0.category', 'homeopathic')
            );
    }

    public function test_default_filter_returns_only_auto_selected_items(): void
    {
        AdviceItem::create([
            'text_bn' => 'ডিফল্ট পরামর্শ',
            'category' => 'general',
            'is_default' => true,
        ]);

        AdviceItem::create([
            'text_bn' => 'ঐচ্ছিক পরামর্শ',
            'category' => 'general',
            'is_default' => false,
        ]);

        $response = $this->actingAs($this->admin)->get(route('admin.advice_items.index', ['default' => 'default']));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('adviceItems.data', 1)
                ->where('adviceItems.data.0.is_default', true)
            );
    }

    public function test_authorized_user_can_store_advice_item(): void
    {
        $response = $this->actingAs($this->admin)->post(route('admin.advice_items.store'), [
            'text_bn' => 'নিয়মিত পুষ্টিকর খাদ্য গ্রহণ করুন',
            'text_en' => 'Eat nutritious food regularly',
            'category' => 'diet',
            'is_default' => true,
            'is_active' => true,
            'sort_order' => 5,
        ]);

        $response->assertRedirect(route('admin.advice_items.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('advice_items', [
            'text_bn' => 'নিয়মিত পুষ্টিকর খাদ্য গ্রহণ করুন',
            'text_en' => 'Eat nutritious food regularly',
            'category' => 'diet',
            'is_default' => 1,
            'is_active' => 1,
            'sort_order' => 5,
        ]);
    }

    public function test_store_validation_requires_bengali_text_and_valid_category(): void
    {
        $response = $this->actingAs($this->admin)->post(route('admin.advice_items.store'), [
            'text_bn' => '',
            'category' => 'invalid_category',
        ]);

        $response->assertSessionHasErrors(['text_bn', 'category']);
    }

    public function test_authorized_user_can_update_advice_item(): void
    {
        $advice = AdviceItem::create([
            'text_bn' => 'পুরাতন পরামর্শ',
            'category' => 'general',
            'is_default' => false,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->put(route('admin.advice_items.update', $advice), [
            'text_bn' => 'হালনাগাদ করা পরামর্শ',
            'text_en' => 'Updated advice',
            'category' => 'lifestyle',
            'is_default' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $response->assertRedirect(route('admin.advice_items.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('advice_items', [
            'id' => $advice->id,
            'text_bn' => 'হালনাগাদ করা পরামর্শ',
            'category' => 'lifestyle',
            'is_default' => 1,
        ]);
    }

    public function test_advice_item_without_visits_can_be_permanently_deleted(): void
    {
        $advice = AdviceItem::create([
            'text_bn' => 'মুছে ফেলার পরামর্শ',
            'category' => 'general',
            'is_default' => false,
        ]);

        $response = $this->actingAs($this->admin)->delete(route('admin.advice_items.destroy', $advice));
        $response->assertRedirect();

        $this->assertDatabaseMissing('advice_items', ['id' => $advice->id]);
    }

    public function test_advice_item_linked_to_visit_is_safely_deactivated_instead_of_deleted(): void
    {
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id]);

        $advice = AdviceItem::create([
            'text_bn' => 'প্রেসক্রিপশনে যুক্ত পরামর্শ',
            'category' => 'homeopathic',
            'is_default' => true,
            'is_active' => true,
        ]);

        $visit->adviceItems()->attach($advice->id);

        $response = $this->actingAs($this->admin)->delete(route('admin.advice_items.destroy', $advice));
        $response->assertRedirect()
            ->assertSessionHas('info');

        // Record is preserved in database but marked inactive
        $this->assertDatabaseHas('advice_items', [
            'id' => $advice->id,
            'is_active' => 0,
        ]);
    }

    public function test_unauthorized_user_cannot_manage_advice_items(): void
    {
        $unauthorized = User::factory()->create(['is_active' => true]);

        $this->actingAs($unauthorized)->get(route('admin.advice_items.index'))->assertForbidden();
        $this->actingAs($unauthorized)->post(route('admin.advice_items.store'), ['text_bn' => 'টেস্ট'])->assertForbidden();
    }
}
