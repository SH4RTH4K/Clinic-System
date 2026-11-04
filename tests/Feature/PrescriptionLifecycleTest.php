<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitAmendment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PrescriptionLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'visits.view', 'visits.create', 'visits.update', 'visits.amend',
            'visits.finalize', 'visits.cancel', 'visits.cancel_other', 'visits.export', 'clinical_records.view',
        ] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        foreach (['Doctor', 'Receptionist', 'Super Admin'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        ClinicSetting::create([
            'clinic_name_en' => 'Test Clinic',
            'doctor_name' => 'Clinic Doctor',
            'doctor_credentials' => 'MBBS',
            'address' => 'Test address',
            'phone' => '0000000000',
        ]);
    }

    public function test_draft_prescriptions_cannot_be_issued_as_pdfs(): void
    {
        $user = $this->userWithPermissions('Doctor', ['visits.export']);
        $visit = Visit::factory()->create();

        $this->actingAs($user)
            ->get(route('admin.visits.pdf', $visit))
            ->assertForbidden();
    }

    public function test_printing_requires_export_permission_and_uses_authorized_prescriber_snapshot(): void
    {
        $visit = $this->finalizedVisit();
        $this->prescriptionItem($visit, $this->medicine());
        $viewer = $this->userWithPermissions('Doctor', ['visits.view']);

        $this->actingAs($viewer)
            ->get(route('admin.visits.pdf', $visit))
            ->assertForbidden();

        $printer = $this->userWithPermissions('Doctor', ['visits.export', 'patients.view']);
        $response = $this->actingAs($printer)->get(route('admin.visits.pdf', $visit));

        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertStringContainsString('private', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_pdf_export_permission_without_patient_access_cannot_retrieve_patient_data(): void
    {
        $visit = $this->finalizedVisit();
        $this->prescriptionItem($visit, $this->medicine());
        $exporter = $this->userWithPermissions('Doctor', ['visits.export']);

        $this->actingAs($exporter)
            ->get(route('admin.visits.pdf', $visit))
            ->assertForbidden();
    }

    public function test_legacy_unverified_snapshot_cannot_be_issued_as_an_authorized_pdf(): void
    {
        $visit = $this->finalizedVisit();
        $medicine = $this->medicine();
        $item = $this->prescriptionItem($visit, $medicine);
        $snapshot = $item->prescription_snapshot;
        unset($snapshot['provenance']);
        $item->update(['prescription_snapshot' => $snapshot]);
        $printer = $this->userWithPermissions('Doctor', ['visits.export', 'patients.view']);

        $this->actingAs($printer)
            ->get(route('admin.visits.pdf', $visit))
            ->assertForbidden();
    }

    public function test_finalized_amendment_preserves_previous_item_and_snapshots_new_catalog_details(): void
    {
        $patient = Patient::factory()->create();
        $editor = $this->userWithPermissions('Doctor', ['visits.amend']);
        $linkedDoctor = Doctor::query()->create([
            'name' => 'Amending Prescriber',
            'credentials' => 'DHMS',
            'govt_reg_no' => 'REG-456',
            'user_id' => $editor->id,
            'is_active' => true,
            'sort_order' => 1,
        ]);
        $visit = $this->finalizedVisit($patient, ['doctor_id' => $linkedDoctor->id]);
        $originalMedicine = $this->medicine('Arnica', '30C', 'drops');
        $originalItem = $this->prescriptionItem($visit, $originalMedicine);

        $originalMedicine->update(['name' => 'Arnica Updated', 'potency' => '200C', 'form' => 'pills']);

        $this->actingAs($editor)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($visit, [
                'amendment_reason' => 'Correct the potency and directions after review.',
                'prescription_items' => [$this->prescriptionPayload($originalMedicine, ['dose_qty' => 4])],
            ]))
            ->assertRedirect(route('admin.visits.show', $visit));

        $activeItem = $visit->prescriptionItems()->firstOrFail();
        $previousItem = PrescriptionItem::withTrashed()->findOrFail($originalItem->id);

        $this->assertNotNull($previousItem->deleted_at);
        $this->assertSame(1, $previousItem->prescription_version);
        $this->assertSame('Arnica', $previousItem->prescription_snapshot['medicine_name']);
        $this->assertSame('30C', $previousItem->prescription_snapshot['potency']);
        $this->assertSame('drops', $previousItem->prescription_snapshot['formulation']);
        $this->assertSame(2, $activeItem->prescription_version);
        $this->assertSame('Arnica Updated', $activeItem->prescription_snapshot['medicine_name']);
        $this->assertSame('200C', $activeItem->prescription_snapshot['potency']);
        $this->assertSame('pills', $activeItem->prescription_snapshot['formulation']);
        $this->assertSame($linkedDoctor->name, $activeItem->prescription_snapshot['authorizer']['doctor_name']);
        $this->assertSame($editor->id, $visit->fresh()->prescription_authorizer_snapshot['authorized_by_user_id']);
        $this->assertSame('amended', $visit->fresh()->prescription_status);
        $this->assertSame(['prescription_items'], VisitAmendment::query()->latest()->firstOrFail()->changed_fields);

        $auditor = $this->userWithPermissions('Doctor', ['visits.view']);
        $this->actingAs($auditor)
            ->get(route('admin.visits.show', $visit))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('prescriptionHistory.0.prescription_snapshot.medicine_name', 'Arnica')
                ->where('prescriptionHistory.0.prescription_version', 1)
                ->where('prescriptionHistory.1.prescription_snapshot.medicine_name', 'Arnica Updated')
                ->where('prescriptionHistory.1.prescription_version', 2));
    }

    public function test_catalog_edits_do_not_change_the_issued_prescription_snapshot(): void
    {
        $visit = $this->finalizedVisit();
        $medicine = $this->medicine('Arnica', '30C', 'drops');
        $item = $this->prescriptionItem($visit, $medicine);
        $medicine->update(['name' => 'Renamed Catalog Entry', 'potency' => '200C', 'form' => 'pills']);
        $item->update(['dose_qty' => 8]);

        $visit->load(['patient', 'doctor', 'symptoms', 'prescriptionItems.medicine', 'adviceItems', 'foodRestrictions']);
        $settings = ClinicSetting::query()->firstOrFail();
        $html = view('pdf.prescription', [
            'visit' => $visit,
            'settings' => $settings,
            'prescriptionConfig' => $settings->getPrescriptionConfig(),
        ])->render();

        $this->assertStringContainsString('Arnica', $html);
        $this->assertStringContainsString('Dr. Authorized Snapshot', $html);
        $this->assertStringContainsString('Authorized by Staff Account Snapshot', $html);
        $this->assertStringContainsString('30C', $html);
        $this->assertStringContainsString('Drops', $html);
        $this->assertStringContainsString('2 ', $html);
        $this->assertStringNotContainsString('8 ফোঁটা', $html);
        $this->assertStringContainsString('With water.', $html);
        $this->assertStringNotContainsString('Renamed Catalog Entry', $html);
        $this->assertStringNotContainsString('200C', $html);
        $this->assertSame(1, $visit->prescriptionItems()->count());
        $this->assertSame('Arnica', $item->fresh()->prescription_snapshot['medicine_name']);
    }

    public function test_patient_identity_cannot_change_during_a_finalized_amendment(): void
    {
        $editor = $this->userWithPermissions('Doctor', ['visits.amend']);
        $doctor = Doctor::query()->create([
            'name' => 'Responsible Prescriber',
            'user_id' => $editor->id,
            'is_active' => true,
            'sort_order' => 1,
        ]);
        $visit = $this->finalizedVisit(null, ['doctor_id' => $doctor->id]);
        $originalPatientId = $visit->patient_id;
        $otherPatient = Patient::factory()->create();

        $this->actingAs($editor)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($visit, [
                'patient_id' => $otherPatient->id,
                'amendment_reason' => 'Attempted to change the patient identity.',
            ]))
            ->assertSessionHasErrors('patient_id');

        $this->assertSame($originalPatientId, $visit->fresh()->patient_id);
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_patient_identity_is_frozen_on_the_prescription_document(): void
    {
        $patient = Patient::factory()->create(['name' => 'Original Patient Name']);
        $visit = $this->finalizedVisit($patient);
        $medicine = $this->medicine();
        $this->prescriptionItem($visit, $medicine);
        $patient->update(['name' => 'Later Patient Name']);

        $visit->load(['patient', 'doctor', 'symptoms', 'prescriptionItems.medicine', 'adviceItems', 'foodRestrictions']);
        $settings = ClinicSetting::query()->firstOrFail();
        $html = view('pdf.prescription', [
            'visit' => $visit,
            'settings' => $settings,
            'prescriptionConfig' => $settings->getPrescriptionConfig(),
        ])->render();

        $this->assertStringContainsString('Original Patient Name', $html);
        $this->assertStringNotContainsString('Later Patient Name', $html);
    }

    public function test_user_without_amend_permission_cannot_replace_finalized_prescription_items(): void
    {
        $visit = $this->finalizedVisit();
        $medicine = $this->medicine();
        $item = $this->prescriptionItem($visit, $medicine);
        $editor = $this->userWithPermissions('Doctor', ['visits.update']);

        $this->actingAs($editor)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($visit, [
                'amendment_reason' => 'Attempt a protected prescription change.',
                'prescription_items' => [$this->prescriptionPayload($medicine, ['dose_qty' => 4])],
            ]))
            ->assertForbidden();

        $this->assertNull($item->fresh()->deleted_at);
        $this->assertSame(1, $visit->prescriptionItems()->count());
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_amend_permission_without_a_linked_prescriber_cannot_change_prescription_content(): void
    {
        $visit = $this->finalizedVisit();
        $medicine = $this->medicine();
        $item = $this->prescriptionItem($visit, $medicine);
        $editor = $this->userWithPermissions('Doctor', ['visits.amend']);

        $this->actingAs($editor)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($visit, [
                'amendment_reason' => 'Correct a prescription direction after review.',
                'prescription_items' => [$this->prescriptionPayload($medicine, ['dose_qty' => 4])],
            ]))
            ->assertForbidden();

        $this->assertNull($item->fresh()->deleted_at);
        $this->assertSame(1, $visit->prescriptionItems()->count());
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_cancellation_requires_its_permission_and_reason_and_blocks_future_issue(): void
    {
        $canceller = $this->userWithPermissions('Doctor', ['visits.view', 'visits.cancel', 'visits.export']);
        $doctor = $this->doctorProfile($canceller);
        $visit = $this->finalizedVisit(null, ['doctor_id' => $doctor->id]);
        $prescriptionItem = $this->prescriptionItem($visit, $this->medicine());
        $originalPrescriptionSnapshot = $prescriptionItem->prescription_snapshot;
        $originalPrescriberSnapshot = $visit->prescriber_snapshot;
        $user = $this->userWithPermissions('Doctor', ['visits.view', 'visits.export']);

        $this->actingAs($user)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'No permission'])
            ->assertForbidden();

        $this->actingAs($canceller)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => ''])
            ->assertSessionHasErrors('reason');

        $this->actingAs($canceller)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Prescription no longer clinically appropriate.'])
            ->assertRedirect(route('admin.visits.show', $visit));

        $this->assertSame('cancelled', $visit->fresh()->prescription_status);
        $this->assertSame($canceller->id, $visit->fresh()->cancelled_by);
        $this->assertNotNull($visit->fresh()->cancelled_at);
        $amendment = VisitAmendment::query()->latest()->firstOrFail();
        $this->assertSame(['prescription_status'], $amendment->changed_fields);
        $this->assertSame('Prescription no longer clinically appropriate.', $amendment->reason);
        $this->assertSame($doctor->id, $amendment->amended_by_doctor_id);
        $this->assertSame($canceller->id, $amendment->amended_by);
        $this->assertSame($doctor->id, $visit->fresh()->doctor_id);
        $this->assertSame($originalPrescriberSnapshot, $visit->fresh()->prescriber_snapshot);
        $this->assertSame($originalPrescriptionSnapshot, $prescriptionItem->fresh()->prescription_snapshot);

        $this->actingAs($canceller)
            ->get(route('admin.visits.pdf', $visit))
            ->assertForbidden();
    }

    public function test_cancelled_finalized_prescription_cannot_be_amended(): void
    {
        $visit = $this->finalizedVisit(attributes: ['prescription_status' => 'cancelled']);
        $editor = $this->userWithPermissions('Doctor', ['visits.amend']);

        $this->actingAs($editor)
            ->put(route('admin.visits.update', $visit), $this->visitPayload($visit, [
                'amendment_reason' => 'Attempt to edit a cancelled prescription.',
            ]))
            ->assertForbidden();
    }

    public function test_cross_doctor_cancellation_needs_explicit_exceptional_permission(): void
    {
        $originalDoctor = $this->doctorProfile($this->userWithPermissions('Doctor', []));
        $coveringDoctorUser = $this->userWithPermissions('Doctor', ['visits.view', 'visits.cancel']);
        $this->doctorProfile($coveringDoctorUser);
        $visit = $this->finalizedVisit(null, ['doctor_id' => $originalDoctor->id]);

        $this->actingAs($coveringDoctorUser)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Authorized clinical review.'])
            ->assertForbidden();

        $this->assertSame('finalized', $visit->fresh()->prescription_status);
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_cross_doctor_cancellation_records_actor_and_preserves_prescriber_snapshot(): void
    {
        $originalDoctorUser = $this->userWithPermissions('Doctor', []);
        $originalDoctor = $this->doctorProfile($originalDoctorUser);
        $visit = $this->finalizedVisit(null, ['doctor_id' => $originalDoctor->id]);
        $originalSnapshot = $visit->prescriber_snapshot;
        $actor = $this->userWithPermissions('Doctor', ['visits.view', 'visits.cancel', 'visits.cancel_other']);
        $actorDoctor = $this->doctorProfile($actor);

        $this->actingAs($actor)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Reviewed and documented covering care.'])
            ->assertRedirect(route('admin.visits.show', $visit));

        $visit->refresh();
        $amendment = VisitAmendment::query()->latest()->firstOrFail();
        $this->assertSame('cancelled', $visit->prescription_status);
        $this->assertSame($originalDoctor->id, $visit->doctor_id);
        $this->assertSame($originalSnapshot, $visit->prescriber_snapshot);
        $this->assertSame($actor->id, $visit->cancelled_by);
        $this->assertSame($actor->id, $amendment->amended_by);
        $this->assertSame($actorDoctor->id, $amendment->amended_by_doctor_id);
        $this->assertSame('Reviewed and documented covering care.', $amendment->reason);
    }

    public function test_prescription_without_reliable_responsible_doctor_cannot_be_cancelled(): void
    {
        $actor = $this->userWithPermissions('Doctor', ['visits.view', 'visits.cancel', 'visits.cancel_other']);
        $this->doctorProfile($actor);
        $visit = $this->finalizedVisit(null, ['doctor_id' => null]);

        $this->actingAs($actor)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Unassigned prescription review.'])
            ->assertForbidden();

        $this->assertSame('finalized', $visit->fresh()->prescription_status);
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_cancellation_requires_active_doctor_profile_and_does_not_grant_technical_super_admin_authority(): void
    {
        $originalDoctor = $this->doctorProfile($this->userWithPermissions('Doctor', []));
        $visit = $this->finalizedVisit(null, ['doctor_id' => $originalDoctor->id]);
        $admin = $this->userWithPermissions('Super Admin', ['clinical_records.view', 'visits.view', 'visits.cancel']);

        $this->actingAs($admin)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Administrative account attempt.'])
            ->assertForbidden();

        $inactiveDoctorUser = $this->userWithPermissions('Doctor', ['visits.view', 'visits.cancel']);
        $this->doctorProfile($inactiveDoctorUser, false);

        $this->actingAs($inactiveDoctorUser)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Inactive profile attempt.'])
            ->assertForbidden();

        $this->assertSame('finalized', $visit->fresh()->prescription_status);
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    public function test_cancelled_prescription_cannot_be_cancelled_twice(): void
    {
        $doctorUser = $this->userWithPermissions('Doctor', ['visits.view', 'visits.cancel']);
        $doctor = $this->doctorProfile($doctorUser);
        $visit = $this->finalizedVisit(null, ['doctor_id' => $doctor->id]);

        $this->actingAs($doctorUser)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Cancel after review.'])
            ->assertRedirect(route('admin.visits.show', $visit));

        $cancelledAt = $visit->fresh()->cancelled_at;

        $this->actingAs($doctorUser)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Try cancelling it again.'])
            ->assertForbidden();

        $this->assertSame($cancelledAt->toISOString(), $visit->fresh()->cancelled_at->toISOString());
        $this->assertDatabaseCount('visit_amendments', 1);
    }

    public function test_receptionist_and_user_without_visit_view_cannot_cancel_prescriptions(): void
    {
        $doctor = $this->doctorProfile($this->userWithPermissions('Doctor', []));
        $visit = $this->finalizedVisit(null, ['doctor_id' => $doctor->id]);
        $receptionist = $this->userWithPermissions('Receptionist', ['clinical_records.view', 'visits.cancel']);

        $this->actingAs($receptionist)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'Attempted by receptionist.'])
            ->assertForbidden();

        $doctorWithoutVisitView = $this->userWithPermissions('Doctor', ['visits.cancel']);
        $this->doctorProfile($doctorWithoutVisitView);

        $this->actingAs($doctorWithoutVisitView)
            ->post(route('admin.visits.cancel_prescription', $visit), ['reason' => 'No visit view permission.'])
            ->assertForbidden();

        $this->assertSame('finalized', $visit->fresh()->prescription_status);
        $this->assertDatabaseCount('visit_amendments', 0);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function finalizedVisit(?Patient $patient = null, array $attributes = []): Visit
    {
        $patient ??= Patient::factory()->create();

        return Visit::factory()->finalized()->create([
            'patient_id' => $patient->id,
            'finalized_at' => now(),
            'patient_snapshot' => [
                'patient_id' => $patient->id,
                'patient_identifier' => $patient->patient_identifier,
                'name' => $patient->name,
                'gender' => $patient->gender,
                'phone' => $patient->phone,
            ],
            'prescriber_snapshot' => [
                'doctor_name' => 'Dr. Authorized Snapshot',
                'credentials' => 'DHMS',
                'registration_number' => 'REG-123',
                'authorized_by_name' => 'Staff Account Snapshot',
                'authorized_at' => now()->toISOString(),
            ],
            ...$attributes,
        ]);
    }

    private function medicine(string $name = 'Arnica', string $potency = '30C', string $form = 'drops'): Medicine
    {
        return Medicine::query()->create([
            'name' => $name,
            'potency' => $potency,
            'form' => $form,
            'default_instruction' => 'Use as directed.',
            'is_active' => true,
        ]);
    }

    private function prescriptionItem(Visit $visit, Medicine $medicine): PrescriptionItem
    {
        $payload = $this->prescriptionPayload($medicine);

        return PrescriptionItem::query()->create([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'prescription_version' => 1,
            ...$payload,
            'prescription_snapshot' => [
                'medicine_id' => $medicine->id,
                'medicine_name' => $medicine->name,
                'potency' => $medicine->potency,
                'formulation' => $medicine->form,
                'catalog_instruction' => $medicine->default_instruction,
                'authorizer' => [
                    'authorized_by_user_id' => 42,
                    'authorized_at' => now()->toISOString(),
                ],
                'provenance' => [
                    'kind' => 'prescriber_authorized_capture',
                    'status' => 'captured_at_authorization',
                    'captured_at' => now()->toISOString(),
                ],
                'directions' => [
                    'timing' => $payload['timing'],
                    'before_after' => $payload['before_after'],
                    'dose_qty' => $payload['dose_qty'],
                    'dose_unit' => $payload['dose_unit'],
                    'dilution_note' => $payload['dilution_note'],
                    'duration_days' => $payload['duration_days'],
                ],
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function prescriptionPayload(Medicine $medicine, array $overrides = []): array
    {
        return array_merge([
            'medicine_id' => $medicine->id,
            'sort_order' => 0,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 2,
            'dose_unit' => 'drops',
            'dilution_note' => 'With water.',
            'duration_days' => 7,
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function visitPayload(Visit $visit, array $overrides = []): array
    {
        return array_merge([
            'patient_id' => $visit->patient_id,
            'visit_date' => $visit->visit_date->toDateString(),
            'age_at_visit' => $visit->age_at_visit,
            'age_months' => $visit->age_months,
            'age_days' => $visit->age_days,
            'chief_complaint' => $visit->chief_complaint,
            'bp_symptoms_notes' => $visit->bp_symptoms_notes,
            'diagnosis_notes' => $visit->diagnosis_notes,
            'follow_up_date' => $visit->follow_up_date?->toDateString(),
            'status' => 'finalized',
        ], $overrides);
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userWithPermissions(string $roleName, array $permissions): User
    {
        if ($roleName === 'Doctor') {
            $permissions[] = 'clinical_records.view';
        }

        $user = User::factory()->create([
            'password' => Hash::make('Password1!'),
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole($roleName);

        if ($permissions !== []) {
            $user->givePermissionTo($permissions);
        }

        return $user;
    }

    private function doctorProfile(User $user, bool $isActive = true): Doctor
    {
        return Doctor::query()->create([
            'name' => 'Synthetic Doctor '.$user->id,
            'user_id' => $user->id,
            'is_active' => $isActive,
            'sort_order' => $user->id,
        ]);
    }
}
