<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Pharmaceutical;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ReportWorkstationTest extends TestCase
{
    use RefreshDatabase;

    private User $authorizedDoctor;

    private User $unauthorizedUser;

    private Doctor $doctorA;

    private Doctor $doctorB;

    private Patient $patientA;

    private Patient $patientB;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'clinical_records.view',
            'patients.view',
            'visits.view',
            'reports.view',
            'reports.export',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $doctorRole = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo($permissions);

        $receptionistRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $receptionistRole->givePermissionTo(['patients.view']);

        $this->app->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->authorizedDoctor = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->authorizedDoctor->assignRole($doctorRole);

        $this->unauthorizedUser = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $this->unauthorizedUser->assignRole($receptionistRole);

        $this->doctorA = Doctor::factory()->create([
            'name' => 'Fazlul Karim',
            'specialty' => 'Classical Homeopathy',
        ]);

        $this->doctorB = Doctor::factory()->create([
            'name' => 'Nasreen Sultana',
            'specialty' => 'General Medicine',
        ]);

        $this->patientA = Patient::factory()->create([
            'name' => 'Abdul Alim',
            'phone' => '01711002233',
            'gender' => 'male',
            'patient_code' => 'P-2026-0101',
        ]);

        $this->patientB = Patient::factory()->create([
            'name' => 'Fatema Begum',
            'phone' => '01811445566',
            'gender' => 'female',
            'patient_code' => 'P-2026-0102',
        ]);
    }

    public function test_unauthorized_user_without_permission_cannot_access_reports(): void
    {
        $response = $this->actingAs($this->unauthorizedUser)->get(route('admin.reports.index'));
        $response->assertForbidden();
    }

    public function test_authorized_user_can_view_reports_workstation_with_5_kpi_cards(): void
    {
        Visit::factory()->create([
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'visit_date' => now()->toDateString(),
            'status' => 'finalized',
            'final_diagnosis' => 'Acute Gastritis',
            'chief_complaint' => 'Severe burning stomach ache',
        ]);

        Visit::factory()->create([
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctorB->id,
            'visit_date' => now()->toDateString(),
            'status' => 'draft',
            'provisional_diagnosis' => 'Chronic Migraine',
            'chief_complaint' => 'Throbbing right-sided headache',
        ]);

        $response = $this->actingAs($this->authorizedDoctor)->get(route('admin.reports.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Reports/Index')
            ->has('metrics', fn (Assert $m) => $m
                ->where('total_consultations', 2)
                ->where('unique_patients', 2)
                ->where('finalized_prescriptions', 1)
                ->has('daily_average')
                ->has('total_remedies_prescribed'))
            ->has('filters')
            ->has('doctorsList')
            ->has('visits.data', 2)
            ->has('topDiagnoses')
        );
    }

    public function test_reports_multi_parameter_search_by_patient_and_diagnosis(): void
    {
        Visit::factory()->create([
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'visit_date' => now()->toDateString(),
            'status' => 'finalized',
            'final_diagnosis' => 'Psoriasis Vulgaris',
            'chief_complaint' => 'Skin scaling and itching',
        ]);

        Visit::factory()->create([
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctorB->id,
            'visit_date' => now()->toDateString(),
            'status' => 'draft',
            'final_diagnosis' => 'Bronchial Asthma',
            'chief_complaint' => 'Shortness of breath on exertion',
        ]);

        // Search by patient name
        $response = $this->actingAs($this->authorizedDoctor)
            ->get(route('admin.reports.index', ['search' => 'Abdul Alim']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.patient.name', 'Abdul Alim')
        );

        // Search by diagnosis
        $responseDiag = $this->actingAs($this->authorizedDoctor)
            ->get(route('admin.reports.index', ['search' => 'Asthma']));

        $responseDiag->assertOk();
        $responseDiag->assertInertia(fn (Assert $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.final_diagnosis', 'Bronchial Asthma')
        );
    }

    public function test_reports_filtering_by_attending_doctor(): void
    {
        Visit::factory()->create([
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'visit_date' => now()->toDateString(),
        ]);

        Visit::factory()->create([
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctorB->id,
            'visit_date' => now()->toDateString(),
        ]);

        $response = $this->actingAs($this->authorizedDoctor)
            ->get(route('admin.reports.index', ['doctor_id' => $this->doctorA->id]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.doctor_id', $this->doctorA->id)
            ->where('metrics.total_consultations', 1)
        );
    }

    public function test_reports_date_presets_filtering(): void
    {
        // Visit today
        Visit::factory()->create([
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'visit_date' => Carbon::today()->toDateString(),
        ]);

        // Visit yesterday
        Visit::factory()->create([
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctorB->id,
            'visit_date' => Carbon::yesterday()->toDateString(),
        ]);

        // Filter by today
        $responseToday = $this->actingAs($this->authorizedDoctor)
            ->get(route('admin.reports.index', ['date_preset' => 'today']));

        $responseToday->assertOk();
        $responseToday->assertInertia(fn (Assert $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.patient_id', $this->patientA->id)
            ->where('metrics.total_consultations', 1)
        );

        // Filter by yesterday
        $responseYesterday = $this->actingAs($this->authorizedDoctor)
            ->get(route('admin.reports.index', ['date_preset' => 'yesterday']));

        $responseYesterday->assertOk();
        $responseYesterday->assertInertia(fn (Assert $page) => $page
            ->has('visits.data', 1)
            ->where('visits.data.0.patient_id', $this->patientB->id)
            ->where('metrics.total_consultations', 1)
        );
    }

    public function test_reports_doctor_productivity_breakdown_tab(): void
    {
        Visit::factory()->create([
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'visit_date' => now()->toDateString(),
            'status' => 'finalized',
        ]);

        Visit::factory()->create([
            'patient_id' => $this->patientB->id,
            'doctor_id' => $this->doctorA->id,
            'visit_date' => now()->toDateString(),
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->authorizedDoctor)
            ->get(route('admin.reports.index', ['tab' => 'doctors']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->where('filters.tab', 'doctors')
            ->has('doctorBreakdown')
            ->where('doctorBreakdown.0.doctor_name', 'Fazlul Karim')
            ->where('doctorBreakdown.0.total_visits', 2)
            ->where('doctorBreakdown.0.finalized_visits', 1)
            ->where('doctorBreakdown.0.completion_rate', fn ($val) => (float) $val === 50.0)
        );
    }

    public function test_reports_top_prescribed_remedies_tab(): void
    {
        $visit = Visit::factory()->create([
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'visit_date' => now()->toDateString(),
        ]);

        $medicine = Medicine::query()->create([
            'name' => 'Thuja Occidentalis',
            'potency' => '200CH',
            'form' => 'drops',
        ]);

        $pharma = Pharmaceutical::query()->create([
            'brand_name' => 'Napa Extra',
            'generic_name' => 'Paracetamol + Caffeine',
            'strength' => '500mg+65mg',
            'dosage_form' => 'Tablet',
            'manufacturer' => 'Beximco Pharmaceuticals Ltd',
        ]);

        PrescriptionItem::query()->create([
            'visit_id' => $visit->id,
            'item_type' => 'remedy',
            'medicine_id' => $medicine->id,
            'dose_qty' => 5,
            'dose_unit' => 'drops',
            'timing' => ['morning', 'night'],
            'before_after' => 'after',
        ]);

        PrescriptionItem::query()->create([
            'visit_id' => $visit->id,
            'item_type' => 'pharmaceutical',
            'pharmaceutical_id' => $pharma->id,
            'brand_name' => 'Napa Extra',
            'generic_name' => 'Paracetamol + Caffeine',
            'strength' => '500mg+65mg',
            'dosage_form' => 'Tablet',
            'dose_qty' => 1,
            'dose_unit' => 'tablet',
            'timing' => ['morning', 'night'],
            'before_after' => 'after',
        ]);

        $response = $this->actingAs($this->authorizedDoctor)
            ->get(route('admin.reports.index', ['tab' => 'remedies']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->where('filters.tab', 'remedies')
            ->has('topRemedies', 2)
            ->where('metrics.total_remedies_prescribed', 2)
        );
    }

    public function test_authorized_user_can_stream_csv_export(): void
    {
        Visit::factory()->create([
            'patient_id' => $this->patientA->id,
            'doctor_id' => $this->doctorA->id,
            'visit_date' => now()->toDateString(),
            'status' => 'finalized',
            'chief_complaint' => 'Skin rash and itching',
            'final_diagnosis' => 'Urticaria',
        ]);

        $response = $this->actingAs($this->authorizedDoctor)
            ->get(route('admin.reports.export'));

        $response->assertOk();
        $this->assertTrue($response->headers->contains('content-type', 'text/csv; charset=UTF-8'));

        $content = $response->streamedContent();
        $this->assertStringContainsString('Visit Date', $content);
        $this->assertStringContainsString('Patient Name', $content);
        $this->assertStringContainsString('Chief Complaint', $content);
        $this->assertStringContainsString('Abdul Alim', $content);
        $this->assertStringContainsString('Urticaria', $content);
        $this->assertStringContainsString('Fazlul Karim', $content);
    }

    public function test_unauthorized_user_without_export_permission_cannot_export_reports(): void
    {
        $response = $this->actingAs($this->unauthorizedUser)
            ->get(route('admin.reports.export'));

        $response->assertForbidden();
    }
}
