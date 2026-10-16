<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VisitIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $modules = ['patients', 'visits', 'medicines', 'symptoms', 'symptom_medicine_map',
            'appointments', 'reports', 'settings', 'users', 'roles', 'activity_logs'];
        $actions = ['view', 'create', 'update', 'delete', 'export', 'amend'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}"]);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $doctor = Role::firstOrCreate(['name' => 'Doctor']);
        Role::firstOrCreate(['name' => 'Receptionist']);

        $superAdmin->givePermissionTo(Permission::all());
        $doctor->givePermissionTo([
            'patients.view', 'patients.create',
            'visits.view', 'visits.create', 'visits.update', 'visits.delete',
        ]);
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    private function makePatient(): Patient
    {
        return Patient::factory()->create();
    }

    private function makeVisit(string $status = 'draft'): Visit
    {
        $patient = $this->makePatient();

        return Visit::factory()->create([
            'patient_id' => $patient->id,
            'status' => $status,
        ]);
    }

    // -------------------------------------------------------------------------
    // Test 1: Visit store rejects malformed prescription_items (never 500)
    // Note: Inertia form requests redirect back with session errors (302),
    // not a raw 422 response. We assert session errors instead.
    // -------------------------------------------------------------------------

    public function test_store_visit_with_invalid_prescription_items_returns_422(): void
    {
        $patient = $this->makePatient();

        $this->actingAs($this->userWithRole('Doctor'))
            ->post('/admin/visits', [
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Headache',
                'status' => 'draft',
                'prescription_items' => [
                    ['medicine_id' => 99999, 'timing' => ['morning'], 'before_after' => 'after', 'dose_qty' => 1, 'dose_unit' => 'drops'],
                ],
            ])
            ->assertSessionHasErrors(['prescription_items.0.medicine_id']);
    }

    // -------------------------------------------------------------------------
    // Test 2: Visit store requires timing to be a non-empty array
    // -------------------------------------------------------------------------

    public function test_store_visit_with_empty_timing_returns_422(): void
    {
        $patient = $this->makePatient();
        $medicine = Medicine::create(['name' => 'Arnica', 'potency' => '30C', 'form' => 'drops', 'is_active' => true]);

        $this->actingAs($this->userWithRole('Doctor'))
            ->post('/admin/visits', [
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Headache',
                'status' => 'draft',
                'prescription_items' => [
                    ['medicine_id' => $medicine->id, 'timing' => [], 'before_after' => 'after', 'dose_qty' => 1, 'dose_unit' => 'drops'],
                ],
            ])
            ->assertSessionHasErrors(['prescription_items.0.timing']);
    }

    // -------------------------------------------------------------------------
    // Test 3: Invalid timing value returns validation error
    // -------------------------------------------------------------------------

    public function test_store_visit_with_invalid_timing_value_returns_422(): void
    {
        $patient = $this->makePatient();
        $medicine = Medicine::create(['name' => 'Arnica', 'potency' => '30C', 'form' => 'drops', 'is_active' => true]);

        $this->actingAs($this->userWithRole('Doctor'))
            ->post('/admin/visits', [
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Test',
                'status' => 'draft',
                'prescription_items' => [
                    ['medicine_id' => $medicine->id, 'timing' => ['midnight'], 'before_after' => 'after', 'dose_qty' => 1, 'dose_unit' => 'drops'],
                ],
            ])
            ->assertSessionHasErrors(['prescription_items.0.timing.0']);
    }

    // -------------------------------------------------------------------------
    // Test 4: Finalized visit cannot be updated without visits.amend
    // -------------------------------------------------------------------------

    public function test_doctor_cannot_update_finalized_visit(): void
    {
        $visit = $this->makeVisit('finalized');

        $this->actingAs($this->userWithRole('Doctor'))
            ->put("/admin/visits/{$visit->id}", [
                'patient_id' => $visit->patient_id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Modified',
                'status' => 'finalized',
            ])
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 5: Finalized visit cannot be deleted by Doctor
    // -------------------------------------------------------------------------

    public function test_doctor_cannot_delete_finalized_visit(): void
    {
        $visit = $this->makeVisit('finalized');

        $this->actingAs($this->userWithRole('Doctor'))
            ->delete("/admin/visits/{$visit->id}")
            ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Test 6: Super Admin can update a finalized visit (has visits.amend)
    // -------------------------------------------------------------------------

    public function test_super_admin_can_update_finalized_visit(): void
    {
        $visit = $this->makeVisit('finalized');

        $this->actingAs($this->userWithRole('Super Admin'))
            ->put("/admin/visits/{$visit->id}", [
                'patient_id' => $visit->patient_id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Amended complaint',
                'status' => 'finalized',
            ])
            ->assertRedirect(route('admin.visits.show', $visit->id));
    }

    // -------------------------------------------------------------------------
    // Test 7: Draft visit can be updated by Doctor (no amend needed)
    // -------------------------------------------------------------------------

    public function test_doctor_can_update_draft_visit(): void
    {
        $visit = $this->makeVisit('draft');

        $this->actingAs($this->userWithRole('Doctor'))
            ->put("/admin/visits/{$visit->id}", [
                'patient_id' => $visit->patient_id,
                'visit_date' => now()->toDateString(),
                'chief_complaint' => 'Updated draft',
                'status' => 'draft',
            ])
            ->assertRedirect(route('admin.visits.show', $visit->id));
    }

    // -------------------------------------------------------------------------
    // Test 8: Visit create page does NOT include a full patient list in props
    // -------------------------------------------------------------------------

    public function test_visit_create_page_does_not_include_full_patient_list(): void
    {
        $response = $this->actingAs($this->userWithRole('Doctor'))
            ->get('/admin/visits/create');

        $response->assertStatus(200);

        // The page props must not contain a 'patients' key
        $response->assertInertia(fn (AssertableInertia $page) => $page->missing('patients'));
    }

    // -------------------------------------------------------------------------
    // Test 9: Patient search endpoint requires at least 2 characters
    // -------------------------------------------------------------------------

    public function test_patient_search_requires_minimum_two_characters(): void
    {
        $this->actingAs($this->userWithRole('Doctor'))
            ->getJson('/admin/patients/search?q=a')
            ->assertStatus(422);
    }

    // -------------------------------------------------------------------------
    // Test 10: Patient search does not return known_allergies or address
    // -------------------------------------------------------------------------

    public function test_patient_search_does_not_expose_sensitive_fields(): void
    {
        Patient::factory()->create(['name' => 'Search Target Patient', 'known_allergies' => 'Peanuts']);

        $response = $this->actingAs($this->userWithRole('Doctor'))
            ->getJson('/admin/patients/search?q=Search Target')
            ->assertStatus(200);

        $patients = $response->json();
        $this->assertNotEmpty($patients);
        $first = $patients[0];

        $this->assertArrayNotHasKey('known_allergies', $first);
        $this->assertArrayNotHasKey('address', $first);
        $this->assertArrayNotHasKey('dob', $first);
        $this->assertArrayHasKey('id', $first);
        $this->assertArrayHasKey('name', $first);
    }

    // -------------------------------------------------------------------------
    // Test 11: Storing a visit persists years, months, days and computes age_summary
    // -------------------------------------------------------------------------

    public function test_store_visit_persists_years_months_days_and_computes_age_summary(): void
    {
        $patient = $this->makePatient();

        $response = $this->actingAs($this->userWithRole('Doctor'))
            ->post('/admin/visits', [
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'age_at_visit' => 5,
                'age_months' => 4,
                'age_days' => 12,
                'chief_complaint' => 'Cough and cold',
                'status' => 'draft',
            ]);

        $response->assertRedirect(route('admin.visits.index'));

        $visit = Visit::latest('id')->first();
        $this->assertEquals(5, $visit->age_at_visit);
        $this->assertEquals(4, $visit->age_months);
        $this->assertEquals(12, $visit->age_days);
        $this->assertEquals('5 Y 4 M', $visit->age_summary);
    }

    // -------------------------------------------------------------------------
    // Test 12: Storing a visit with invalid age bounds fails validation
    // -------------------------------------------------------------------------

    public function test_store_visit_with_invalid_age_bounds_returns_422(): void
    {
        $patient = $this->makePatient();

        $this->actingAs($this->userWithRole('Doctor'))
            ->post('/admin/visits', [
                'patient_id' => $patient->id,
                'visit_date' => now()->toDateString(),
                'age_at_visit' => 200,
                'age_months' => 15,
                'age_days' => 45,
                'chief_complaint' => 'Invalid age',
                'status' => 'draft',
            ])
            ->assertSessionHasErrors(['age_at_visit', 'age_months', 'age_days']);
    }

    // -------------------------------------------------------------------------
    // Test 13: Updating a visit updates age components
    // -------------------------------------------------------------------------

    public function test_update_visit_updates_age_components(): void
    {
        $visit = $this->makeVisit('draft');

        $response = $this->actingAs($this->userWithRole('Doctor'))
            ->put("/admin/visits/{$visit->id}", [
                'patient_id' => $visit->patient_id,
                'visit_date' => now()->toDateString(),
                'age_at_visit' => 0,
                'age_months' => 8,
                'age_days' => 20,
                'chief_complaint' => 'Infant teething fever',
                'status' => 'draft',
            ]);

        $response->assertRedirect(route('admin.visits.show', $visit->id));

        $visit->refresh();
        $this->assertEquals(0, $visit->age_at_visit);
        $this->assertEquals(8, $visit->age_months);
        $this->assertEquals(20, $visit->age_days);
        $this->assertEquals('8 M 20 D', $visit->age_summary);
    }
}
