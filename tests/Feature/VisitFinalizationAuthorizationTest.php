<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitAmendment;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VisitFinalizationAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'visits.view', 'visits.create', 'visits.update', 'visits.delete', 'visits.amend', 'visits.finalize', 'clinical_records.view',
            'doctors.create', 'doctors.update',
        ] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        foreach (['Super Admin', 'Doctor', 'Receptionist'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        Role::findByName('Super Admin')->givePermissionTo([
            'visits.view', 'visits.create', 'visits.update', 'visits.delete', 'visits.amend',
        ]);
    }

    public function test_doctor_creates_a_draft_for_their_linked_profile_and_cannot_submit_another_doctor_id(): void
    {
        $user = $this->userWithPermissions('Doctor', ['visits.create']);
        $patient = Patient::factory()->create();
        $doctor = $this->doctorProfile('Responsible Doctor', $user);
        $otherDoctor = $this->doctorProfile('Spoofed Doctor');

        $this->actingAs($user)
            ->post(route('admin.visits.store'), $this->visitPayload($patient, [
                'status' => 'finalized',
                'doctor_id' => $otherDoctor->id,
            ]))
            ->assertSessionHasErrors('doctor_id');

        $this->assertDatabaseCount('visits', 0);

        $this->actingAs($user)
            ->post(route('admin.visits.store'), $this->visitPayload($patient))
            ->assertRedirect(route('admin.visits.index'));

        $visit = Visit::query()->firstOrFail();

        $this->assertSame('draft', $visit->status);
        $this->assertSame($doctor->id, $visit->doctor_id);
        $this->assertSame($user->id, $visit->created_by);
        $this->assertNull($visit->finalized_by);
        $this->assertNull($visit->finalized_at);
    }

    public function test_finalization_requires_both_the_permission_and_an_active_linked_doctor_profile(): void
    {
        $patient = Patient::factory()->create();
        $user = $this->userWithPermissions('Doctor', ['visits.create', 'visits.finalize']);

        $this->actingAs($user)
            ->post(route('admin.visits.finalize'), $this->visitPayload($patient))
            ->assertForbidden();

        $this->assertDatabaseCount('visits', 0);

        $unpermittedDoctor = $this->userWithPermissions('Doctor', ['visits.create']);
        $this->doctorProfile('Doctor without finalize access', $unpermittedDoctor);
        $this->actingAs($unpermittedDoctor)
            ->post(route('admin.visits.finalize'), $this->visitPayload($patient))
            ->assertForbidden();

        $this->assertDatabaseCount('visits', 0);

        $doctor = $this->doctorProfile('Inactive linked doctor', $user, false);

        $this->actingAs($user)
            ->post(route('admin.visits.finalize'), $this->visitPayload($patient))
            ->assertForbidden();

        $this->assertDatabaseCount('visits', 0);
        $this->assertFalse($doctor->fresh()->is_active);
    }

    public function test_super_admin_does_not_get_prescribing_authority_from_administrative_role(): void
    {
        $patient = Patient::factory()->create();
        $admin = $this->userWithPermissions('Super Admin', ['visits.create']);
        $this->doctorProfile('Administrative profile', $admin);

        $this->actingAs($admin)
            ->post(route('admin.visits.finalize'), $this->visitPayload($patient))
            ->assertForbidden();

        $this->assertDatabaseCount('visits', 0);
    }

    public function test_finalize_rejects_a_submitted_doctor_id_and_uses_the_linked_prescriber(): void
    {
        $patient = Patient::factory()->create();
        $prescriber = $this->userWithPermissions('Doctor', ['visits.create', 'visits.finalize']);
        $linkedDoctor = $this->doctorProfile('Authorized Prescriber', $prescriber);
        $otherDoctor = $this->doctorProfile('Other Doctor');

        $this->actingAs($prescriber)
            ->post(route('admin.visits.finalize'), $this->visitPayload($patient, ['doctor_id' => $otherDoctor->id]))
            ->assertSessionHasErrors('doctor_id');

        $this->assertDatabaseCount('visits', 0);

        $this->actingAs($prescriber)
            ->post(route('admin.visits.finalize'), $this->visitPayload($patient))
            ->assertRedirect(route('admin.visits.index'));

        $visit = Visit::query()->firstOrFail();
        $this->assertSame('finalized', $visit->status);
        $this->assertSame($linkedDoctor->id, $visit->doctor_id);
        $this->assertSame($prescriber->id, $visit->created_by);
        $this->assertSame($prescriber->id, $visit->finalized_by);
        $this->assertNotNull($visit->finalized_at);
        $this->assertSame('finalized', $visit->prescription_status);
        $this->assertSame('Authorized Prescriber', $visit->prescriber_snapshot['doctor_name']);
        $this->assertSame($prescriber->name, $visit->prescriber_snapshot['authorized_by_name']);
    }

    public function test_finalizing_a_visit_snapshots_each_prescription_item_with_the_authorized_prescriber(): void
    {
        $patient = Patient::factory()->create();
        $prescriber = $this->userWithPermissions('Doctor', ['visits.create', 'visits.finalize']);
        $doctor = $this->doctorProfile('Snapshot Prescriber', $prescriber);
        $medicines = collect([
            Medicine::query()->create([
                'name' => 'Fictional Medicine One',
                'potency' => '30C',
                'form' => 'drops',
                'default_instruction' => 'Use as recorded.',
                'is_active' => true,
            ]),
            Medicine::query()->create([
                'name' => 'Fictional Medicine Two',
                'potency' => '200C',
                'form' => 'pills',
                'default_instruction' => 'Use as recorded.',
                'is_active' => true,
            ]),
        ]);

        $payload = $this->visitPayload($patient, [
            'prescription_items' => $medicines->map(fn (Medicine $medicine, int $index): array => [
                'medicine_id' => $medicine->id,
                'timing' => [$index === 0 ? 'morning' : 'night'],
                'before_after' => $index === 0 ? 'after' : 'before',
                'dose_qty' => $index + 1,
                'dose_unit' => $index === 0 ? 'drops' : 'pills',
                'dilution_note' => 'Fictional test directions.',
                'duration_days' => 7 + $index,
            ])->all(),
        ]);

        $this->actingAs($prescriber)
            ->post(route('admin.visits.finalize'), $payload)
            ->assertRedirect(route('admin.visits.index'));

        $visit = Visit::query()->firstOrFail();
        $items = $visit->prescriptionItems()->orderBy('sort_order')->get();

        $this->assertSame('finalized', $visit->status);
        $this->assertSame($doctor->id, $visit->doctor_id);
        $this->assertSame($prescriber->id, $visit->created_by);
        $this->assertSame($prescriber->id, $visit->finalized_by);
        $this->assertNotNull($visit->finalized_at);
        $this->assertCount(2, $items);

        foreach ($items as $index => $item) {
            $snapshot = $item->prescription_snapshot;

            $this->assertSame($medicines[$index]->name, $snapshot['medicine_name']);
            $this->assertSame($medicines[$index]->potency, $snapshot['potency']);
            $this->assertSame($medicines[$index]->form, $snapshot['formulation']);
            $this->assertSame($prescriber->id, $snapshot['authorizer']['authorized_by_user_id']);
            $this->assertSame($doctor->name, $snapshot['authorizer']['doctor_name']);
            $this->assertSame('captured_at_authorization', $snapshot['provenance']['status']);
            $this->assertSame([$index === 0 ? 'morning' : 'night'], $snapshot['directions']['timing']);
        }
    }

    public function test_finalization_rolls_back_visit_and_prescription_changes_when_snapshot_persistence_fails(): void
    {
        $patient = Patient::factory()->create();
        $prescriber = $this->userWithPermissions('Doctor', ['visits.create', 'visits.finalize']);
        $this->doctorProfile('Rollback Test Prescriber', $prescriber);
        $medicine = Medicine::query()->create([
            'name' => 'Fictional Rollback Medicine',
            'potency' => '30C',
            'form' => 'drops',
            'default_instruction' => 'Use as recorded.',
            'is_active' => true,
        ]);

        DB::unprepared("CREATE TRIGGER fail_prescription_snapshot_update BEFORE UPDATE OF prescription_snapshot ON prescription_items BEGIN SELECT RAISE(ABORT, 'synthetic snapshot failure'); END");

        $response = $this->actingAs($prescriber)
            ->post(route('admin.visits.finalize'), $this->visitPayload($patient, [
                'prescription_items' => [[
                    'medicine_id' => $medicine->id,
                    'timing' => ['morning'],
                    'before_after' => 'after',
                    'dose_qty' => 2,
                    'dose_unit' => 'drops',
                    'dilution_note' => 'Synthetic directions.',
                    'duration_days' => 7,
                ]],
            ]));

        $response->assertServerError();
        $this->assertDatabaseCount('visits', 0);
        $this->assertDatabaseCount('prescription_items', 0);
    }

    public function test_authorized_prescriber_can_finalize_an_existing_draft_without_changing_identity_from_input(): void
    {
        $patient = Patient::factory()->create();
        $prescriber = $this->userWithPermissions('Doctor', ['visits.update', 'visits.finalize']);
        $linkedDoctor = $this->doctorProfile('Linked Doctor', $prescriber);
        $otherDoctor = $this->doctorProfile('Spoof Target');
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $linkedDoctor->id,
            'status' => 'draft',
            'created_by' => $prescriber->id,
        ]);

        $this->actingAs($prescriber)
            ->post(route('admin.visits.finalize_draft', $visit), $this->visitPayload($patient, [
                'doctor_id' => $otherDoctor->id,
                'chief_complaint' => 'Updated before prescriber authorization',
            ]))
            ->assertSessionHasErrors('doctor_id');

        $this->actingAs($prescriber)
            ->post(route('admin.visits.finalize_draft', $visit), $this->visitPayload($patient, [
                'chief_complaint' => 'Authorized complaint',
            ]))
            ->assertRedirect(route('admin.visits.show', $visit->id));

        $visit->refresh();
        $this->assertSame('finalized', $visit->status);
        $this->assertSame($linkedDoctor->id, $visit->doctor_id);
        $this->assertSame($prescriber->id, $visit->created_by);
        $this->assertSame('Authorized complaint', $visit->chief_complaint);
        $this->assertSame($prescriber->id, $visit->finalized_by);
        $this->assertNotNull($visit->finalized_at);
        $this->assertSame('Linked Doctor', $visit->prescriber_snapshot['doctor_name']);
    }

    public function test_doctor_can_edit_their_own_assigned_draft_without_changing_its_responsible_doctor(): void
    {
        $patient = Patient::factory()->create();
        $doctorUser = $this->userWithPermissions('Doctor', ['visits.update']);
        $doctor = $this->doctorProfile('Doctor A', $doctorUser);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'created_by' => $doctorUser->id,
            'status' => 'draft',
            'chief_complaint' => 'Original draft complaint',
        ]);
        $otherDoctor = $this->doctorProfile('Other Doctor');

        $this->actingAs($doctorUser)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'doctor_id' => $otherDoctor->id,
                'chief_complaint' => 'Spoofed responsible Doctor',
            ]))
            ->assertSessionHasErrors('doctor_id');

        $this->assertSame('Original draft complaint', $visit->fresh()->chief_complaint);
        $this->assertSame($doctor->id, $visit->fresh()->doctor_id);

        $this->actingAs($doctorUser)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'chief_complaint' => 'Doctor A updated complaint',
            ]))
            ->assertRedirect(route('admin.visits.show', $visit->id));

        $visit->refresh();
        $this->assertSame('Doctor A updated complaint', $visit->chief_complaint);
        $this->assertSame($doctor->id, $visit->doctor_id);
        $this->assertSame($doctorUser->id, $visit->created_by);
    }

    public function test_doctor_b_can_view_but_cannot_edit_or_finalize_doctor_as_draft(): void
    {
        $patient = Patient::factory()->create();
        $doctorA = $this->userWithPermissions('Doctor', ['visits.view']);
        $doctorAProfile = $this->doctorProfile('Doctor A', $doctorA);
        $doctorB = $this->userWithPermissions('Doctor', ['visits.view', 'visits.update', 'visits.finalize']);
        $this->doctorProfile('Doctor B', $doctorB);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctorAProfile->id,
            'created_by' => $doctorA->id,
            'status' => 'draft',
            'chief_complaint' => 'Doctor A confidential draft',
        ]);

        $this->actingAs($doctorB)
            ->get(route('admin.visits.show', $visit))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('visit.chief_complaint', 'Doctor A confidential draft'));

        $this->actingAs($doctorB)
            ->get(route('admin.visits.edit', $visit))
            ->assertForbidden();

        $this->actingAs($doctorB)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'chief_complaint' => 'Unauthorized cross-doctor edit',
            ]))
            ->assertForbidden();

        $this->actingAs($doctorB)
            ->post(route('admin.visits.finalize_draft', $visit), $this->visitPayload($patient))
            ->assertForbidden();

        $this->assertSame('Doctor A confidential draft', $visit->fresh()->chief_complaint);
        $this->assertSame($doctorAProfile->id, $visit->fresh()->doctor_id);
        $this->assertSame('draft', $visit->fresh()->status);
    }

    public function test_covering_doctor_creates_and_finalizes_a_separate_visit_for_the_shared_patient(): void
    {
        $patient = Patient::factory()->create();
        $doctorA = $this->userWithPermissions('Doctor', ['visits.view']);
        $doctorAProfile = $this->doctorProfile('Doctor A', $doctorA);
        $originalVisit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctorAProfile->id,
            'created_by' => $doctorA->id,
            'status' => 'draft',
        ]);

        $doctorB = $this->userWithPermissions('Doctor', ['visits.create', 'visits.update', 'visits.finalize']);
        $doctorBProfile = $this->doctorProfile('Covering Doctor', $doctorB);

        $this->actingAs($doctorB)
            ->post(route('admin.visits.store'), $this->visitPayload($patient, [
                'chief_complaint' => 'Covering doctor assessment',
            ]))
            ->assertRedirect(route('admin.visits.index'));

        $coveringVisit = Visit::query()->where('chief_complaint', 'Covering doctor assessment')->firstOrFail();
        $this->assertNotSame($originalVisit->id, $coveringVisit->id);
        $this->assertSame($patient->id, $coveringVisit->patient_id);
        $this->assertSame($doctorBProfile->id, $coveringVisit->doctor_id);
        $this->assertSame($doctorB->id, $coveringVisit->created_by);
        $this->assertSame('draft', $coveringVisit->status);

        $this->actingAs($doctorB)
            ->post(route('admin.visits.finalize_draft', $coveringVisit), $this->visitPayload($patient, [
                'chief_complaint' => 'Covering doctor assessment',
            ]))
            ->assertRedirect(route('admin.visits.show', $coveringVisit->id));

        $coveringVisit->refresh();
        $this->assertSame('finalized', $coveringVisit->status);
        $this->assertSame($doctorBProfile->id, $coveringVisit->doctor_id);
        $this->assertSame($doctorB->id, $coveringVisit->finalized_by);
        $this->assertNotNull($coveringVisit->finalized_at);
        $this->assertSame('Doctor A', $originalVisit->fresh()->doctor->name);
    }

    public function test_unassigned_legacy_visit_is_not_claimed_by_a_doctor_during_edit_or_finalization(): void
    {
        $patient = Patient::factory()->create();
        $doctor = $this->userWithPermissions('Doctor', ['visits.update', 'visits.finalize']);
        $this->doctorProfile('Doctor B', $doctor);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => null,
            'created_by' => null,
            'status' => 'draft',
        ]);

        $this->actingAs($doctor)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient))
            ->assertForbidden();

        $this->actingAs($doctor)
            ->post(route('admin.visits.finalize_draft', $visit), $this->visitPayload($patient))
            ->assertForbidden();

        $this->assertNull($visit->fresh()->doctor_id);
        $this->assertNull($visit->fresh()->created_by);
        $this->assertSame('draft', $visit->fresh()->status);
    }

    public function test_staff_created_unassigned_draft_keeps_no_doctor_and_cannot_be_finalized(): void
    {
        $patient = Patient::factory()->create();
        $staff = $this->userWithPermissions('Receptionist', [
            'clinical_records.view', 'visits.create', 'visits.update', 'visits.finalize',
        ]);

        $this->actingAs($staff)
            ->post(route('admin.visits.store'), $this->visitPayload($patient))
            ->assertRedirect(route('admin.visits.index'));

        $visit = Visit::query()->firstOrFail();
        $this->assertNull($visit->doctor_id);
        $this->assertSame($staff->id, $visit->created_by);

        $this->actingAs($staff)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'chief_complaint' => 'Staff-owned unassigned draft update',
            ]))
            ->assertRedirect(route('admin.visits.show', $visit->id));

        $this->actingAs($staff)
            ->post(route('admin.visits.finalize_draft', $visit), $this->visitPayload($patient))
            ->assertForbidden();

        $this->assertNull($visit->fresh()->doctor_id);
        $this->assertSame('Staff-owned unassigned draft update', $visit->fresh()->chief_complaint);
        $this->assertSame('draft', $visit->fresh()->status);
    }

    public function test_finalized_visit_rejects_a_second_finalization_attempt(): void
    {
        $patient = Patient::factory()->create();
        $doctor = $this->userWithPermissions('Doctor', ['visits.create', 'visits.update', 'visits.finalize']);
        $profile = $this->doctorProfile('Finalizing Doctor', $doctor);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $profile->id,
            'created_by' => $doctor->id,
            'status' => 'draft',
        ]);

        $this->actingAs($doctor)
            ->post(route('admin.visits.finalize_draft', $visit), $this->visitPayload($patient))
            ->assertRedirect(route('admin.visits.show', $visit->id));

        $finalizedAt = $visit->fresh()->finalized_at;
        $this->actingAs($doctor)
            ->post(route('admin.visits.finalize_draft', $visit), $this->visitPayload($patient))
            ->assertForbidden();

        $this->assertSame('finalized', $visit->fresh()->status);
        $this->assertSame($doctor->id, $visit->fresh()->finalized_by);
        $this->assertSame($finalizedAt->toISOString(), $visit->fresh()->finalized_at->toISOString());
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_only_visits_amend_can_edit_a_finalized_visit_and_reason_is_audited(): void
    {
        $patient = Patient::factory()->create();
        $amender = $this->userWithPermissions('Doctor', ['visits.amend']);
        $doctor = $this->doctorProfile('Original Responsible Doctor', $amender);
        $visit = Visit::factory()->finalized()->create(['patient_id' => $patient->id, 'doctor_id' => $doctor->id]);

        $this->actingAs($amender)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'status' => 'finalized',
                'chief_complaint' => 'Corrected complaint',
            ]))
            ->assertSessionHasErrors('amendment_reason');

        $visit->refresh();
        $this->assertSame('finalized', $visit->status);
        $this->assertNotSame('Corrected complaint', $visit->chief_complaint);
        $this->assertDatabaseCount('visit_amendments', 0);

        $this->actingAs($amender)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'status' => 'finalized',
                'chief_complaint' => 'Corrected complaint',
                'amendment_reason' => 'Corrected a transcription error in the complaint.',
            ]))
            ->assertRedirect(route('admin.visits.show', $visit->id));

        $visit->refresh();
        $amendment = VisitAmendment::query()->firstOrFail();
        $this->assertSame('finalized', $visit->status);
        $this->assertSame('Corrected complaint', $visit->chief_complaint);
        $this->assertSame($amender->id, $amendment->amended_by);
        $this->assertSame('Corrected a transcription error in the complaint.', $amendment->reason);
        $this->assertContains('chief_complaint', $amendment->changed_fields);
        $this->assertNotNull($amendment->created_at);
    }

    public function test_another_doctor_cannot_amend_a_finalized_visit_or_change_its_prescription_snapshot(): void
    {
        $patient = Patient::factory()->create();
        $doctorA = $this->userWithPermissions('Doctor', ['visits.view', 'visits.amend']);
        $doctorAProfile = $this->doctorProfile('Original Prescriber', $doctorA);
        $doctorB = $this->userWithPermissions('Doctor', ['visits.view', 'visits.amend']);
        $this->doctorProfile('Covering Doctor', $doctorB);
        $medicine = Medicine::query()->create([
            'name' => 'Original Snapshot Medicine',
            'potency' => '30C',
            'form' => 'pills',
            'is_active' => true,
        ]);
        $visit = Visit::factory()->finalized()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctorAProfile->id,
            'created_by' => $doctorA->id,
            'finalized_by' => $doctorA->id,
        ]);
        $item = PrescriptionItem::query()->create([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'sort_order' => 0,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 5,
            'dose_unit' => 'pills',
            'dilution_note' => 'Original directions',
            'duration_days' => 7,
            'prescription_version' => 1,
            'prescription_snapshot' => [
                'medicine_name' => 'Original Snapshot Medicine',
                'potency' => '30C',
                'form' => 'pills',
                'directions' => ['dose' => '5 pills', 'timing' => ['morning']],
            ],
        ]);
        $snapshotBefore = $item->prescription_snapshot;

        $this->actingAs($doctorB)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'status' => 'finalized',
                'amendment_reason' => 'Attempted cross-doctor prescription change.',
                'chief_complaint' => 'Unauthorized finalized change',
                'prescription_items' => [[
                    'medicine_id' => $medicine->id,
                    'timing' => ['night'],
                    'before_after' => 'before',
                    'dose_qty' => 10,
                    'dose_unit' => 'pills',
                    'dilution_note' => 'Changed directions',
                    'duration_days' => 14,
                ]],
            ]))
            ->assertForbidden();

        $this->assertSame($doctorAProfile->id, $visit->fresh()->doctor_id);
        $this->assertSame('finalized', $visit->fresh()->status);
        $this->assertNotSame('Unauthorized finalized change', $visit->fresh()->chief_complaint);
        $this->assertSame($snapshotBefore, $item->fresh()->prescription_snapshot);
        $this->assertSame(1, $item->fresh()->prescription_version);
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_amendment_permission_cannot_change_a_finalized_visit_back_to_draft(): void
    {
        $patient = Patient::factory()->create();
        $amender = $this->userWithPermissions('Doctor', ['visits.amend']);
        $doctor = $this->doctorProfile('Original Responsible Doctor', $amender);
        $visit = Visit::factory()->finalized()->create(['patient_id' => $patient->id, 'doctor_id' => $doctor->id]);

        $this->actingAs($amender)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'status' => 'draft',
                'amendment_reason' => 'This must not remove finalized status.',
            ]))
            ->assertSessionHasErrors('status');

        $this->assertSame('finalized', $visit->fresh()->status);
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_visits_update_alone_cannot_amend_a_finalized_visit(): void
    {
        $patient = Patient::factory()->create();
        $editor = $this->userWithPermissions('Doctor', ['visits.update']);
        $visit = Visit::factory()->finalized()->create(['patient_id' => $patient->id]);

        $this->actingAs($editor)
            ->get(route('admin.visits.edit', $visit))
            ->assertForbidden();

        $this->actingAs($editor)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($patient, [
                'status' => 'finalized',
                'amendment_reason' => 'An unauthorized amendment attempt.',
            ]))
            ->assertForbidden();

        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_routine_visit_deactivation_keeps_amendment_history_and_actor_identity(): void
    {
        $patient = Patient::factory()->create();
        $actor = $this->userWithPermissions('Doctor', ['visits.delete']);
        $doctor = $this->doctorProfile('Responsible Doctor', $actor);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'created_by' => $actor->id,
            'status' => 'draft',
        ]);
        $amendment = VisitAmendment::query()->create([
            'visit_id' => $visit->id,
            'amended_by' => $actor->id,
            'reason' => 'Preserved test amendment.',
            'changed_fields' => ['chief_complaint'],
        ]);

        $this->actingAs($actor)
            ->delete(route('admin.visits.destroy', $visit))
            ->assertRedirect(route('admin.visits.index'));

        $this->assertSoftDeleted('visits', ['id' => $visit->id]);
        $this->assertDatabaseHas('visit_amendments', [
            'id' => $amendment->id,
            'visit_id' => $visit->id,
            'amended_by' => $actor->id,
            'reason' => 'Preserved test amendment.',
        ]);
        $this->assertSame(['chief_complaint'], $amendment->fresh()->changed_fields);
        $activity = Activity::forSubject($visit)->where('event', 'deleted')->latest()->firstOrFail();
        $this->assertSame($actor->id, $activity->causer_id);
    }

    public function test_visit_with_amendment_history_cannot_be_hard_deleted(): void
    {
        $patient = Patient::factory()->create();
        $actor = $this->userWithPermissions('Doctor', ['visits.delete']);
        $visit = Visit::factory()->create(['patient_id' => $patient->id, 'status' => 'draft']);
        $amendment = VisitAmendment::query()->create([
            'visit_id' => $visit->id,
            'amended_by' => $actor->id,
            'reason' => 'Retain this audit record.',
            'changed_fields' => ['diagnosis_notes'],
        ]);

        try {
            $visit->forceDelete();
            self::fail('A visit with amendment history must not be hard-deleted.');
        } catch (QueryException) {
            $this->assertModelExists($visit->fresh());
            $this->assertDatabaseHas('visit_amendments', [
                'id' => $amendment->id,
                'amended_by' => $actor->id,
            ]);
        }
    }

    public function test_doctor_profile_with_visit_history_cannot_be_deleted(): void
    {
        $admin = $this->userWithPermissions('Super Admin', []);
        $responsibleDoctor = $this->doctorProfile('Historical Doctor');
        $visit = Visit::factory()->create([
            'doctor_id' => $responsibleDoctor->id,
            'status' => 'draft',
        ]);
        $visit->delete();

        $this->actingAs($admin)
            ->delete(route('admin.doctors.destroy', $responsibleDoctor))
            ->assertSessionHasErrors('doctor');

        $this->assertModelExists($responsibleDoctor->fresh());
        $this->assertSame($responsibleDoctor->id, Visit::withTrashed()->findOrFail($visit->id)->doctor_id);
    }

    public function test_doctor_account_link_cannot_be_transferred_after_visit_history_exists(): void
    {
        $admin = $this->userWithPermissions('Super Admin', []);
        $originalDoctorUser = $this->userWithPermissions('Doctor', []);
        $replacementDoctorUser = $this->userWithPermissions('Doctor', []);
        $doctorProfile = $this->doctorProfile('Historical Doctor', $originalDoctorUser);
        $visit = Visit::factory()->create(['doctor_id' => $doctorProfile->id]);
        $visit->delete();

        $this->actingAs($admin)
            ->put(route('admin.doctors.update', $doctorProfile), [
                'name' => 'Historical Doctor',
                'user_id' => $replacementDoctorUser->id,
                'is_active' => true,
            ])
            ->assertSessionHasErrors('user_id');

        $this->assertSame($originalDoctorUser->id, $doctorProfile->fresh()->user_id);
        $this->assertSame($doctorProfile->id, Visit::withTrashed()->findOrFail($visit->id)->doctor_id);
    }

    public function test_only_super_admin_can_link_a_staff_account_to_a_doctor_profile(): void
    {
        $admin = $this->userWithPermissions('Super Admin', ['doctors.create']);
        $staff = $this->userWithPermissions('Doctor', ['doctors.update']);

        $this->actingAs($admin)
            ->post(route('admin.doctors.store'), [
                'name' => 'Linked Prescriber',
                'user_id' => $staff->id,
                'is_active' => true,
            ])
            ->assertRedirect(route('admin.doctors.index'));

        $linkedProfile = Doctor::query()->where('user_id', $staff->id)->firstOrFail();
        $otherStaff = $this->userWithPermissions('Doctor', ['doctors.update']);

        $this->actingAs($staff)
            ->put(route('admin.doctors.update', $linkedProfile), [
                'name' => $linkedProfile->name,
                'user_id' => $otherStaff->id,
                'is_active' => true,
            ])
            ->assertRedirect(route('admin.doctors.index'));

        $this->assertSame($staff->id, $linkedProfile->fresh()->user_id);
        $this->assertNull($otherStaff->doctorProfile()->first());
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function visitPayload(Patient $patient, array $overrides = []): array
    {
        return array_merge([
            'patient_id' => $patient->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Patient reports a persistent cough.',
            'status' => 'draft',
        ], $overrides);
    }

    /**
     * @param  array<int, string>  $permissions
     * @param  array<string, mixed>  $attributes
     */
    private function userWithPermissions(string $roleName, array $permissions, array $attributes = []): User
    {
        if ($roleName === 'Doctor') {
            $permissions[] = 'clinical_records.view';
        }

        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
            ...$attributes,
        ]);
        $user->assignRole($roleName);

        if ($permissions !== []) {
            $user->givePermissionTo($permissions);
        }

        return $user;
    }

    private function doctorProfile(string $name, ?User $user = null, bool $isActive = true): Doctor
    {
        return Doctor::query()->create([
            'name' => $name,
            'user_id' => $user?->id,
            'is_active' => $isActive,
            'sort_order' => 1,
        ]);
    }
}
