<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use App\Services\Admin\ClinicalAccessAuditService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia;
use LogicException;
use RuntimeException;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClinicalAccessAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();

        foreach ([
            'patients.view', 'visits.view', 'visits.create', 'visits.update', 'visits.finalize', 'visits.export',
            'clinical_records.view', 'patients.create', 'activity_logs.view', 'doctors.update', 'doctors.delete',
        ] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        foreach (['Doctor', 'Receptionist', 'Super Admin'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        ClinicSetting::create([
            'clinic_name_en' => 'Synthetic Audit Clinic',
            'doctor_name' => 'Clinic Doctor',
            'doctor_credentials' => 'DHMS',
            'address' => 'Synthetic address',
            'phone' => '0000000000',
        ]);
    }

    public function test_patient_detail_and_embedded_prescription_history_are_audited_without_clinical_content(): void
    {
        $viewer = $this->userWithPermissions(['patients.view', 'visits.view', 'clinical_records.view']);
        $patient = Patient::factory()->create([
            'name' => 'Audit Synthetic Patient',
            'known_allergies' => 'Audit Synthetic Allergy',
            'address' => 'Audit Synthetic Address',
        ]);
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'diagnosis_notes' => 'Audit Synthetic Diagnosis',
            'chief_complaint' => 'Audit Synthetic Complaint',
        ]);
        $medicine = $this->medicine();
        $this->prescriptionItem($visit, $medicine);

        $this->actingAs($viewer)
            ->get(route('admin.patients.show', $patient))
            ->assertOk();

        $events = Activity::query()->where('log_name', 'clinical_access')->get();

        $this->assertEqualsCanonicalizing(
            ['patient.detail.viewed', 'prescription.history.viewed'],
            $events->pluck('event')->all(),
        );

        foreach ($events as $event) {
            $this->assertSame($viewer->id, $event->causer_id);
            $this->assertSame($patient->id, $event->getExtraProperty('patient_id'));
            $this->assertSame('allowed', $event->getExtraProperty('authorization_outcome'));
            $this->assertNotEmpty($event->getExtraProperty('request_id'));

            $serializedAudit = json_encode([
                'description' => $event->description,
                'event' => $event->event,
                'properties' => $event->properties,
            ], JSON_THROW_ON_ERROR);

            foreach (['Audit Synthetic Patient', 'Audit Synthetic Allergy', 'Audit Synthetic Address', 'Audit Synthetic Diagnosis', 'Audit Synthetic Complaint', $medicine->name, $viewer->password, 'session'] as $sensitiveValue) {
                $this->assertStringNotContainsString($sensitiveValue, $serializedAudit);
            }

            $this->assertEqualsCanonicalizing(
                ['patient_id', 'authorization_outcome', 'request_id'],
                $event->properties->keys()->all(),
            );
        }
    }

    public function test_visit_detail_and_prescription_history_access_are_audited_with_record_ids_only(): void
    {
        $viewer = $this->userWithPermissions(['visits.view', 'clinical_records.view']);
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'diagnosis_notes' => 'Visit detail synthetic diagnosis',
        ]);
        $this->prescriptionItem($visit, $this->medicine());

        $this->actingAs($viewer)
            ->get(route('admin.visits.show', $visit))
            ->assertOk();

        $events = Activity::query()->where('log_name', 'clinical_access')->get();

        $this->assertEqualsCanonicalizing(
            ['prescription.history.viewed', 'visit.detail.viewed'],
            $events->pluck('event')->all(),
        );

        foreach ($events as $event) {
            $this->assertSame($visit->id, $event->subject_id);
            $this->assertSame($patient->id, $event->getExtraProperty('patient_id'));
            $this->assertSame($visit->id, $event->getExtraProperty('visit_id'));
            $this->assertSame('allowed', $event->getExtraProperty('authorization_outcome'));
            $this->assertStringNotContainsString(
                'Visit detail synthetic diagnosis',
                $event->description.json_encode($event->properties),
            );
        }
    }

    public function test_successful_prescription_pdf_export_is_audited(): void
    {
        $printer = $this->userWithPermissions(['visits.export', 'patients.view', 'clinical_records.view']);
        $visit = $this->finalizedVisit();
        $this->prescriptionItem($visit, $this->medicine());

        $response = $this->actingAs($printer)->get(route('admin.visits.pdf', $visit));

        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $event = Activity::query()->where('log_name', 'clinical_access')->where('event', 'prescription.pdf.exported')->firstOrFail();

        $this->assertSame($printer->id, $event->causer_id);
        $this->assertSame($visit->patient_id, $event->getExtraProperty('patient_id'));
        $this->assertSame($visit->id, $event->getExtraProperty('visit_id'));
        $this->assertSame('allowed', $event->getExtraProperty('authorization_outcome'));
        $this->assertEqualsCanonicalizing(
            ['patient_id', 'visit_id', 'authorization_outcome', 'request_id'],
            $event->properties->keys()->all(),
        );
    }

    public function test_denied_visit_access_is_audited_without_clinical_payload(): void
    {
        $user = $this->userWithPermissions(['visits.view']);
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'diagnosis_notes' => 'Denied synthetic diagnosis',
        ]);

        $response = $this->actingAs($user)->get(route('admin.visits.show', $visit));

        $response->assertForbidden();
        $event = Activity::query()->where('log_name', 'clinical_access')->where('event', 'clinical.access.denied')->firstOrFail();

        $this->assertSame($user->id, $event->causer_id);
        $this->assertSame($visit->id, $event->getExtraProperty('visit_id'));
        $this->assertSame('visits.view', $event->getExtraProperty('required_permission'));
        $this->assertSame('denied', $event->getExtraProperty('authorization_outcome'));
        $this->assertStringNotContainsString('Denied synthetic diagnosis', json_encode($event->properties));
        $this->assertStringNotContainsString('Denied synthetic diagnosis', (string) $response->getContent());
    }

    public function test_doctors_cannot_view_or_mutate_activity_logs(): void
    {
        $doctor = $this->userWithPermissions(['activity_logs.view']);
        $activity = Activity::query()->create([
            'log_name' => 'clinical_access',
            'description' => 'patient.detail.viewed',
            'event' => 'patient.detail.viewed',
        ]);

        $this->actingAs($doctor)->get(route('admin.activity_logs.index'))->assertForbidden();
        $this->actingAs($doctor)->put(route('admin.activity_logs.index'), [])->assertMethodNotAllowed();
        $this->actingAs($doctor)->delete(route('admin.activity_logs.index'))->assertMethodNotAllowed();
        $this->assertModelExists($activity);
    }

    public function test_super_admin_receives_only_whitelisted_clinical_audit_metadata(): void
    {
        $administrator = $this->userWithRole('Super Admin', ['activity_logs.view']);
        Activity::query()->create([
            'log_name' => 'clinical_access',
            'description' => 'clinical.access.denied',
            'event' => 'clinical.access.denied',
            'properties' => [
                'patient_id' => 71,
                'visit_id' => 82,
                'authorization_outcome' => 'denied',
                'request_id' => 'server-generated-request-id',
                'diagnosis' => 'Never expose this field',
            ],
        ]);

        $this->actingAs($administrator)
            ->get(route('admin.activity_logs.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('logs.data.0.properties.patient_id', 71)
                ->where('logs.data.0.properties.visit_id', 82)
                ->where('logs.data.0.properties.authorization_outcome', 'denied')
                ->missing('logs.data.0.properties.diagnosis'));
    }

    public function test_denied_draft_pdf_attempt_is_recorded_with_a_safe_reason_code(): void
    {
        $printer = $this->userWithPermissions(['visits.export', 'patients.view', 'clinical_records.view']);
        $visit = Visit::factory()->create(['patient_id' => Patient::factory()->create()->id]);

        $this->actingAs($printer)->get(route('admin.visits.pdf', $visit))->assertForbidden();

        $event = Activity::query()->where('event', 'clinical.access.denied')->firstOrFail();
        $this->assertSame('visits.export', $event->getExtraProperty('required_permission'));
        $this->assertSame('prescription_not_issuable', $event->getExtraProperty('denial_reason'));
        $this->assertSame($visit->id, $event->getExtraProperty('visit_id'));
    }

    public function test_audit_write_failure_is_visible_and_does_not_block_the_authorized_workflow(): void
    {
        $actor = $this->userWithPermissions(['patients.view']);
        $patient = Patient::factory()->create();
        $activityCountBeforeAuditAttempt = Activity::query()->count();
        Activity::creating(function (): void {
            throw new RuntimeException('Synthetic audit backend failure.');
        });

        Log::shouldReceive('warning')
            ->once()
            ->with('Clinical access audit write failed.', [
                'event' => 'patient.detail.viewed',
                'exception' => RuntimeException::class,
            ]);

        app(ClinicalAccessAuditService::class)->patientDetailViewed(
            Request::create('/synthetic-patient-detail'),
            $actor,
            $patient,
            false,
        );

        $this->assertDatabaseCount('activity_log', $activityCountBeforeAuditAttempt);
    }

    public function test_deactivating_doctor_preserves_history_and_blocks_new_finalization(): void
    {
        $doctorUser = $this->userWithPermissions([
            'clinical_records.view', 'visits.create', 'visits.finalize', 'visits.update',
        ]);
        $doctor = $this->doctorProfile($doctorUser);
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'created_by' => $doctorUser->id,
            'prescriber_snapshot' => ['doctor_name' => 'Original Doctor Snapshot', 'authorized_by_user_id' => $doctorUser->id],
        ]);
        $prescription = $this->prescriptionItem($visit, $this->medicine());
        $snapshotBefore = $prescription->prescription_snapshot;
        $administrator = $this->userWithRole('Super Admin');

        $this->actingAs($administrator)
            ->put(route('admin.doctors.update', $doctor), [
                'name' => $doctor->name,
                'user_id' => $doctorUser->id,
                'is_active' => false,
            ])
            ->assertRedirect(route('admin.doctors.index'));

        $this->assertFalse($doctor->fresh()->is_active);
        $this->assertSame($doctor->id, $visit->fresh()->doctor_id);
        $this->assertSame($snapshotBefore, $prescription->fresh()->prescription_snapshot);
        $this->assertSame('Original Doctor Snapshot', $visit->fresh()->prescriber_snapshot['doctor_name']);

        $this->actingAs($doctorUser)
            ->post(route('admin.visits.finalize_draft', $visit), $this->visitPayload($visit))
            ->assertForbidden();

        $this->assertSame('draft', $visit->fresh()->status);
    }

    public function test_inactive_doctor_remains_identifiable_in_authorized_historical_visit_view(): void
    {
        $responsibleUser = $this->userWithPermissions([]);
        $doctor = $this->doctorProfile($responsibleUser);
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id, 'doctor_id' => $doctor->id]);
        $doctor->update(['is_active' => false]);
        $viewer = $this->userWithPermissions(['visits.view', 'clinical_records.view']);

        $this->actingAs($viewer)
            ->get(route('admin.visits.show', $visit))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('visit.doctor.id', $doctor->id)
                ->where('visit.doctor.name', $doctor->name));
    }

    public function test_deactivated_doctor_cannot_amend_a_historical_prescription(): void
    {
        $doctorUser = $this->userWithPermissions(['clinical_records.view', 'visits.amend']);
        $doctor = $this->doctorProfile($doctorUser);
        $visit = $this->finalizedVisit();
        $visit->update(['doctor_id' => $doctor->id]);
        $doctor->update(['is_active' => false]);

        $this->actingAs($doctorUser)
            ->put(route('admin.visits.update', $visit), [
                'patient_id' => $visit->patient_id,
                'visit_date' => $visit->visit_date->toDateString(),
                'chief_complaint' => 'Attempted amendment from inactive Doctor.',
                'status' => 'finalized',
                'amendment_reason' => 'Attempted unauthorized amendment.',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('visit_amendments', 0);
        $this->assertSame('Synthetic Snapshot Doctor', $visit->fresh()->prescriber_snapshot['doctor_name']);
    }

    public function test_doctor_foreign_key_migration_retries_and_restricts_hard_delete(): void
    {
        $doctor = $this->doctorProfile();
        $patient = Patient::factory()->create();
        $visit = Visit::factory()->create(['patient_id' => $patient->id, 'doctor_id' => $doctor->id]);
        $legacyUnassignedVisit = Visit::factory()->create(['patient_id' => $patient->id, 'doctor_id' => null]);
        $migration = require database_path('migrations/2026_11_04_060429_restrict_doctor_deletion_for_historical_visits.php');

        $migration->up();
        $migration->up();

        $foreignKey = collect(Schema::getForeignKeys('visits'))
            ->first(fn (array $key): bool => $key['columns'] === ['doctor_id'] && $key['foreign_table'] === 'doctors');

        $this->assertSame('restrict', strtolower((string) $foreignKey['on_delete']));
        $this->assertSame($doctor->id, $visit->fresh()->doctor_id);
        $this->assertNull($legacyUnassignedVisit->fresh()->doctor_id);

        $this->expectException(QueryException::class);
        DB::table('doctors')->where('id', $doctor->id)->delete();
    }

    public function test_doctor_history_protection_migration_cannot_be_rolled_back(): void
    {
        $migration = require database_path('migrations/2026_11_04_060429_restrict_doctor_deletion_for_historical_visits.php');

        $this->expectException(LogicException::class);
        $migration->down();
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userWithPermissions(array $permissions): User
    {
        return $this->userWithRole('Doctor', $permissions);
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function userWithRole(string $role, array $permissions = []): User
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->assignRole($role);

        if ($permissions !== []) {
            $user->givePermissionTo($permissions);
        }

        return $user;
    }

    private function doctorProfile(?User $user = null): Doctor
    {
        return Doctor::query()->create([
            'name' => 'Historical Test Doctor',
            'user_id' => $user?->id,
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }

    private function medicine(): Medicine
    {
        return Medicine::query()->create([
            'name' => 'Synthetic Audit Medicine',
            'potency' => '30C',
            'form' => 'drops',
            'default_instruction' => 'Synthetic directions only.',
            'is_active' => true,
        ]);
    }

    private function prescriptionItem(Visit $visit, Medicine $medicine): PrescriptionItem
    {
        return PrescriptionItem::query()->create([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'prescription_version' => 1,
            'sort_order' => 0,
            'timing' => ['morning'],
            'before_after' => 'after',
            'dose_qty' => 1,
            'dose_unit' => 'drops',
            'dilution_note' => 'Synthetic directions only.',
            'duration_days' => 7,
            'prescription_snapshot' => [
                'medicine_id' => $medicine->id,
                'medicine_name' => $medicine->name,
                'potency' => $medicine->potency,
                'formulation' => $medicine->form,
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
                    'timing' => ['morning'],
                    'before_after' => 'after',
                    'dose_qty' => 1,
                    'dose_unit' => 'drops',
                    'dilution_note' => 'Synthetic directions only.',
                    'duration_days' => 7,
                ],
            ],
        ]);
    }

    private function finalizedVisit(): Visit
    {
        $patient = Patient::factory()->create();

        return Visit::factory()->finalized()->create([
            'patient_id' => $patient->id,
            'prescription_status' => 'finalized',
            'finalized_at' => now(),
            'patient_snapshot' => [
                'patient_id' => $patient->id,
                'name' => $patient->name,
                'gender' => $patient->gender,
            ],
            'prescriber_snapshot' => [
                'doctor_name' => 'Synthetic Snapshot Doctor',
                'authorized_by_user_id' => 42,
                'authorized_at' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function visitPayload(Visit $visit): array
    {
        return [
            'patient_id' => $visit->patient_id,
            'visit_date' => $visit->visit_date->toDateString(),
            'chief_complaint' => $visit->chief_complaint,
            'status' => 'draft',
        ];
    }
}
