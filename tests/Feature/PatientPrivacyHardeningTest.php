<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\Symptom;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitDraft;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PatientPrivacyHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['patients.view', 'visits.create', 'visits.view', 'clinical_records.view', 'activity_logs.view'] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }
    }

    public function test_visit_drafts_are_encrypted_and_restored_only_for_their_owner(): void
    {
        $owner = $this->userWithPermissions('Doctor', ['visits.create', 'patients.view']);
        $otherUser = $this->userWithPermissions('Doctor', ['visits.create', 'patients.view']);
        $patient = Patient::factory()->create(['name' => 'Private Draft Patient']);
        $payload = array_merge($this->visitDraftPayload($patient), ['doctor_id' => 999999]);

        $this->actingAs($owner)
            ->put(route('admin.visits.draft.update'), [
                'owner_token' => VisitDraft::ownerTokenFor($owner),
                'payload' => $payload,
            ])
            ->assertOk();

        $storedPayload = DB::table('visit_drafts')->where('user_id', $owner->id)->value('payload');
        $this->assertIsString($storedPayload);
        $this->assertStringNotContainsString('Sensitive saved complaint', $storedPayload);
        $this->assertStringNotContainsString('Sensitive prescription instruction', $storedPayload);
        $this->assertArrayNotHasKey(
            'doctor_id',
            VisitDraft::query()->where('user_id', $owner->id)->firstOrFail()->payload,
        );

        $this->actingAs($otherUser)
            ->get(route('admin.visits.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('hasSavedDraft', false)
                ->missing('draft'));

        $this->withHeaders(['X-Visit-Draft-Owner' => VisitDraft::ownerTokenFor($otherUser)])
            ->actingAs($otherUser)
            ->get(route('admin.visits.draft.show'))
            ->assertOk()
            ->assertJsonPath('draft', null);

        $this->actingAs($owner)
            ->get(route('admin.visits.create'))
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertInertia(fn (Assert $page) => $page
                ->where('hasSavedDraft', true)
                ->missing('draft'));

        $this->withHeaders(['X-Visit-Draft-Owner' => VisitDraft::ownerTokenFor($owner)])
            ->get(route('admin.visits.draft.show'))
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('draft.payload.chief_complaint', 'Sensitive saved complaint')
            ->assertJsonPath('draft.patient.name', 'Private Draft Patient');
    }

    public function test_visit_draft_owner_token_prevents_an_old_tab_from_saving_under_a_new_account(): void
    {
        $originalUser = $this->userWithPermissions('Doctor', ['visits.create', 'patients.view']);
        $newUser = $this->userWithPermissions('Doctor', ['visits.create', 'patients.view']);
        $originalPayload = $this->visitDraftPayload(Patient::factory()->create());

        $this->actingAs($originalUser)
            ->put(route('admin.visits.draft.update'), [
                'owner_token' => VisitDraft::ownerTokenFor($originalUser),
                'payload' => $originalPayload,
            ])
            ->assertOk();

        $this->post(route('logout'))->assertRedirect('/');
        $this->get(route('admin.visits.create'))->assertRedirect(route('login'));

        $this->actingAs($newUser)
            ->get(route('admin.visits.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('hasSavedDraft', false));

        $this->withHeaders(['X-Visit-Draft-Owner' => VisitDraft::ownerTokenFor($originalUser)])
            ->actingAs($newUser)
            ->get(route('admin.visits.draft.show'))
            ->assertForbidden();

        $this->actingAs($newUser)
            ->put(route('admin.visits.draft.update'), [
                'owner_token' => VisitDraft::ownerTokenFor($originalUser),
                'payload' => $originalPayload,
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('visit_drafts', ['user_id' => $newUser->id]);
        $this->assertDatabaseHas('visit_drafts', ['user_id' => $originalUser->id]);
    }

    public function test_users_without_visit_create_permission_cannot_read_or_change_drafts(): void
    {
        $user = $this->userWithPermissions('Accountant', []);

        $this->actingAs($user)
            ->get(route('admin.visits.create'))
            ->assertForbidden();

        $this->actingAs($user)
            ->put(route('admin.visits.draft.update'), [
                'owner_token' => VisitDraft::ownerTokenFor($user),
                'payload' => ['chief_complaint' => 'Should not persist'],
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->delete(route('admin.visits.draft.destroy'), ['owner_token' => VisitDraft::ownerTokenFor($user)])
            ->assertForbidden();

        $this->withHeaders(['X-Visit-Draft-Owner' => VisitDraft::ownerTokenFor($user)])
            ->actingAs($user)
            ->get(route('admin.visits.draft.show'))
            ->assertForbidden();
    }

    public function test_draft_restore_omits_patient_identifiers_without_patient_view_permission(): void
    {
        $user = $this->userWithPermissions('Doctor', ['visits.create']);
        $patient = Patient::factory()->create();

        $this->actingAs($user)
            ->put(route('admin.visits.draft.update'), [
                'owner_token' => VisitDraft::ownerTokenFor($user),
                'payload' => $this->visitDraftPayload($patient),
            ])
            ->assertOk();

        $this->withHeaders(['X-Visit-Draft-Owner' => VisitDraft::ownerTokenFor($user)])
            ->actingAs($user)
            ->get(route('admin.visits.draft.show'))
            ->assertOk()
            ->assertJsonMissingPath('draft.payload.patient_id')
            ->assertJsonMissingPath('draft.payload.patient_dob')
            ->assertJsonPath('draft.patient', null);
    }

    public function test_expired_visit_drafts_are_not_restored_and_are_pruned(): void
    {
        $user = $this->userWithPermissions('Doctor', ['visits.create']);
        $draft = VisitDraft::factory()->create([
            'user_id' => $user->id,
            'expires_at' => now()->subMinute(),
        ]);

        $this->actingAs($user)
            ->get(route('admin.visits.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('hasSavedDraft', false));

        $this->assertDatabaseMissing('visit_drafts', ['id' => $draft->id]);

        $expiredDraft = VisitDraft::factory()->create([
            'expires_at' => now()->subMinute(),
        ]);

        $this->artisan('visit-drafts:prune')->assertSuccessful();
        $this->assertDatabaseMissing('visit_drafts', ['id' => $expiredDraft->id]);
    }

    public function test_patient_and_clinical_activity_logs_record_field_names_without_values(): void
    {
        $patient = Patient::factory()->create([
            'name' => 'Original Private Patient',
            'phone' => '01711111111',
        ]);
        $patient->update([
            'name' => 'Updated Private Patient',
            'phone' => '01722222222',
        ]);
        $patientActivity = Activity::forSubject($patient)->where('event', 'updated')->latest()->firstOrFail();

        $visit = Visit::factory()->for($patient)->create([
            'chief_complaint' => 'Original private complaint',
        ]);
        $visit->update([
            'chief_complaint' => 'Updated private complaint',
            'diagnosis_notes' => 'Private diagnosis note',
        ]);
        $visitActivity = Activity::forSubject($visit)->where('event', 'updated')->latest()->firstOrFail();

        $medicine = Medicine::create([
            'name' => 'Privacy Test Remedy',
            'potency' => '30C',
            'form' => 'pills',
            'is_active' => true,
        ]);
        $prescriptionItem = PrescriptionItem::create([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'sort_order' => 0,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 5,
            'dose_unit' => 'pills',
            'dilution_note' => 'Original private instruction',
            'duration_days' => 7,
        ]);
        $prescriptionItem->update([
            'dose_qty' => 10,
            'dilution_note' => 'Updated private instruction',
        ]);
        $prescriptionActivity = Activity::forSubject($prescriptionItem)->where('event', 'updated')->latest()->firstOrFail();

        foreach ([$patientActivity, $visitActivity, $prescriptionActivity] as $activity) {
            $this->assertSame([], $activity->attribute_changes?->all() ?? []);
            $this->assertSame([], $activity->properties?->all() ?? []);
        }

        $this->assertStringContainsString('name', $patientActivity->description);
        $this->assertStringContainsString('phone', $patientActivity->description);
        $this->assertStringContainsString('chief_complaint', $visitActivity->description);
        $this->assertStringContainsString('diagnosis_notes', $visitActivity->description);
        $this->assertStringContainsString('dose_qty', $prescriptionActivity->description);
        $this->assertStringContainsString('dilution_note', $prescriptionActivity->description);

        $auditContent = json_encode([$patientActivity, $visitActivity, $prescriptionActivity], JSON_THROW_ON_ERROR);
        foreach ([
            'Updated Private Patient', '01722222222', 'Updated private complaint',
            'Private diagnosis note', 'Updated private instruction',
        ] as $privateValue) {
            $this->assertStringNotContainsString($privateValue, $auditContent);
        }
    }

    public function test_activity_log_page_is_super_admin_only_and_omits_stored_change_values(): void
    {
        $patient = Patient::factory()->create();
        $doctor = $this->userWithPermissions('Doctor', ['activity_logs.view']);
        $superAdmin = $this->userWithPermissions('Super Admin', ['activity_logs.view']);
        Activity::create([
            'description' => 'patient.updated fields: name',
            'subject_type' => Patient::class,
            'subject_id' => $patient->id,
            'event' => 'updated',
            'causer_type' => User::class,
            'causer_id' => $superAdmin->id,
            'attribute_changes' => json_encode(['attributes' => ['name' => 'Historical Patient Name']], JSON_THROW_ON_ERROR),
            'properties' => ['old' => ['phone' => '01733333333']],
        ]);

        $this->actingAs($doctor)
            ->get(route('admin.activity_logs.index'))
            ->assertForbidden();

        $this->actingAs($superAdmin)
            ->get(route('admin.activity_logs.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('logs.data.0.causer.name', $superAdmin->name)
                ->missing('logs.data.0.causer.email')
                ->missing('logs.data.0.properties')
                ->missing('logs.data.0.attribute_changes'));
    }

    public function test_super_admin_and_doctor_receive_only_the_authorized_patient_visit_summary(): void
    {
        $patient = $this->patientWithSensitiveVisitAndPrescription();

        $doctor = $this->userWithPermissions('Doctor', ['patients.view', 'visits.view', 'clinical_records.view']);
        $response = $this->actingAs($doctor)->get(route('admin.patients.show', $patient->id));
        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('patient.name', 'Synthetic Patient Profile')
                ->where('patient.known_allergies', 'Synthetic allergy detail')
                ->has('patient.visits', 1)
                ->where('patient.visits.0.chief_complaint', 'Synthetic clinical complaint')
                ->where('patient.visits.0.prescription_items.0.medicine.name', 'Synthetic Remedy')
                ->missing('patient.visits.0.diagnosis_notes')
                ->missing('patient.visits.0.prescription_items.0.dose_qty')
                ->missing('patient.visits.0.prescription_items.0.prescription_snapshot')
                ->missing('patient.created_by')
                ->missing('patient.patient_numbering_profile_id'));

        $superAdmin = $this->userWithPermissions('Super Admin', ['patients.view', 'visits.view']);
        $adminResponse = $this->actingAs($superAdmin)->get(route('admin.patients.show', $patient->id));
        $adminResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('patient.name', 'Synthetic Patient Profile')
                ->missing('patient.known_allergies')
                ->missing('patient.visits'));
    }

    public function test_users_with_patient_view_but_without_visit_view_do_not_receive_clinical_props(): void
    {
        $patient = $this->patientWithSensitiveVisitAndPrescription();

        foreach ([
            'Receptionist' => ['patients.view'],
            'Patient Viewer' => ['patients.view'],
        ] as $roleName => $permissions) {
            $user = $this->userWithPermissions($roleName, $permissions);

            $response = $this->actingAs($user)->get(route('admin.patients.show', $patient->id));
            $payload = (string) $response->getContent();

            $response->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('patient.name', 'Synthetic Patient Profile')
                    ->missing('patient.visits')
                    ->missing('patient.created_by')
                    ->missing('patient.patient_numbering_profile_id'));

            $this->assertStringNotContainsString('Synthetic clinical complaint', $payload);
            $this->assertStringNotContainsString('Synthetic diagnosis detail', $payload);
            $this->assertStringNotContainsString('Synthetic Remedy', $payload);
            $this->assertStringNotContainsString('Synthetic prescription instruction', $payload);
        }
    }

    public function test_user_without_patient_view_cannot_open_patient_detail_directly(): void
    {
        $patient = $this->patientWithSensitiveVisitAndPrescription();
        $user = $this->userWithPermissions('Accountant', []);

        $this->actingAs($user)
            ->get(route('admin.patients.show', $patient->id))
            ->assertForbidden();
    }

    public function test_guest_cannot_open_patient_detail_directly(): void
    {
        $patient = Patient::factory()->create();

        $this->get(route('admin.patients.show', $patient->id))
            ->assertRedirect('/login');
    }

    public function test_malformed_or_missing_patient_identifiers_return_not_found_without_props(): void
    {
        $user = $this->userWithPermissions('Doctor', ['patients.view']);

        $this->actingAs($user)
            ->get('/admin/patients/not-a-valid-id')
            ->assertNotFound();

        $this->get('/admin/patients/99999999')
            ->assertNotFound();
    }

    public function test_patient_identifiers_require_patient_view_permission_on_visit_create(): void
    {
        $user = $this->userWithPermissions('Doctor', ['visits.create']);
        $patient = Patient::factory()->create(['name' => 'Do Not Disclose']);

        $this->actingAs($user)
            ->get(route('admin.visits.create', ['patient_id' => $patient->id]))
            ->assertForbidden();
    }

    /** @param array<int, string> $permissions */
    private function userWithPermissions(string $roleName, array $permissions): User
    {
        $role = Role::firstOrCreate(['name' => $roleName]);

        if ($roleName === 'Doctor' && array_intersect($permissions, ['visits.view', 'visits.create']) !== []) {
            $permissions[] = 'clinical_records.view';
        }

        foreach ($permissions as $permissionName) {
            $permission = Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
            $role->givePermissionTo($permission);
        }

        $user = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($role);

        return $user;
    }

    private function patientWithSensitiveVisitAndPrescription(): Patient
    {
        $patient = Patient::factory()->create([
            'name' => 'Synthetic Patient Profile',
            'known_allergies' => 'Synthetic allergy detail',
        ]);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'chief_complaint' => 'Synthetic clinical complaint',
            'diagnosis_notes' => 'Synthetic diagnosis detail',
        ]);
        $medicine = Medicine::create([
            'name' => 'Synthetic Remedy',
            'potency' => 'Synthetic potency',
            'form' => 'pills',
            'default_instruction' => 'Synthetic prescription instruction',
            'is_active' => true,
        ]);

        PrescriptionItem::create([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'sort_order' => 0,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 5,
            'dose_unit' => 'pills',
            'dilution_note' => 'Synthetic prescription instruction',
            'duration_days' => 7,
        ]);

        return $patient;
    }

    /** @return array<string, mixed> */
    private function visitDraftPayload(Patient $patient): array
    {
        $medicine = Medicine::create([
            'name' => 'Draft Test Remedy',
            'potency' => '30C',
            'form' => 'pills',
            'is_active' => true,
        ]);
        $symptom = Symptom::create(['name_en' => 'Draft Test Symptom', 'is_active' => true]);

        return [
            'patient_id' => $patient->id,
            'doctor_id' => null,
            'visit_date' => now()->toDateString(),
            'age_at_visit' => 40,
            'age_months' => 0,
            'age_days' => 0,
            'patient_dob' => null,
            'chief_complaint' => 'Sensitive saved complaint',
            'bp_symptoms_notes' => null,
            'diagnosis_notes' => null,
            'follow_up_date' => null,
            'status' => 'draft',
            'symptoms' => [$symptom->id],
            'prescription_items' => [[
                'medicine_id' => $medicine->id,
                'timing' => ['morning'],
                'before_after' => 'after',
                'dose_qty' => 5,
                'dose_unit' => 'pills',
                'dilution_note' => 'Sensitive prescription instruction',
                'duration_days' => 7,
            ]],
            'advice_items' => [],
            'food_restrictions' => [],
        ];
    }
}
