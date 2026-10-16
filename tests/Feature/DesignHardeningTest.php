<?php

namespace Tests\Feature;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DesignHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $modules = ['patients', 'visits', 'settings', 'doctors'];
        $actions = ['view', 'create', 'update', 'delete'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}"]);
            }
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdmin->givePermissionTo(Permission::all());

        ClinicSetting::create([
            'clinic_name_en' => 'Green Life Homeopathy',
            'clinic_name_bn' => 'গ্রিন লাইফ হোমিওপ্যাথি',
            'doctor_name' => 'Dr. Md. Fazlul Karim',
            'doctor_credentials' => 'D.H.M.S, B.H.B',
            'phone' => '01711000000',
            'address' => 'Dhaka, Bangladesh',
            'about_text' => 'Green Life Homeopathy provides classical constitutional remedies.',
            'about_text_bn' => 'গ্রিন লাইফ হোমিওপ্যাথি ক্লাসিক্যাল সেবা প্রদান করে।',
            'visiting_hours' => 'Sat - Thu: 4 PM - 9 PM',
            'patient_no_series' => 'GL',
            'patient_no_next' => 101,
        ]);
    }

    private function createSuperAdmin(): User
    {
        $user = User::factory()->create([
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_public_site_serves_dynamic_html_lang_attribute(): void
    {
        $response = $this->get('/');
        $response->assertOk();
        $response->assertSee('<html lang="en"', false);

        $bnResponse = $this->withCookie('locale', 'bn')->get('/');
        $bnResponse->assertOk();
        $bnResponse->assertSee('<html lang="bn"', false);
    }

    public function test_language_switch_endpoint_sets_cookie_and_validates(): void
    {
        $response = $this->post('/language', ['locale' => 'bn']);
        $response->assertRedirect();
        $response->assertCookie('locale', 'bn');

        $invalidResponse = $this->post('/language', ['locale' => 'fr']);
        $invalidResponse->assertSessionHasErrors('locale');
    }

    public function test_public_pages_do_not_contain_external_unsplash_references(): void
    {
        $response = $this->get('/');
        $response->assertOk();
        $response->assertDontSee('unsplash.com');
    }

    public function test_about_page_renders_editable_content_and_omits_unverified_claims(): void
    {
        $response = $this->get('/about');
        $response->assertOk();
        $response->assertSee('Green Life Homeopathy provides classical constitutional remedies.');
        $response->assertDontSee('over a decade');
    }

    public function test_about_page_renders_doctor_credentials_and_reg_number(): void
    {
        Doctor::create([
            'name' => 'Dr. Rafiqul Islam',
            'name_bn' => 'ডাঃ রফিকুল ইসলাম',
            'credentials' => 'BHMS (DU)',
            'specialty' => 'Classical Homeopath',
            'govt_reg_no' => 'H-12345',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $response = $this->get('/about');
        $response->assertOk();
        $response->assertSee('Dr. Rafiqul Islam');
        $response->assertSee('BHMS (DU)');
        $response->assertSee('H-12345');
    }

    public function test_visit_creation_persists_treating_doctor_id(): void
    {
        $admin = $this->createSuperAdmin();

        $patient = Patient::create([
            'patient_no' => 101,
            'patient_series' => 'GL',
            'name' => 'Anisur Rahman',
            'phone' => '01711223344',
            'gender' => 'male',
            'age_years' => 35,
        ]);

        $doctor = Doctor::create([
            'name' => 'Dr. Rafiqul Islam',
            'credentials' => 'BHMS (DU)',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $medicine = Medicine::create([
            'name' => 'Arnica Montana',
            'potency' => '200C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        $payload = [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'visit_date' => now()->toDateString(),
            'age_at_visit' => 35,
            'chief_complaint' => 'Chronic lower back pain',
            'status' => 'finalized',
            'prescription_items' => [
                [
                    'medicine_id' => $medicine->id,
                    'timing' => ['morning', 'night'],
                    'before_after' => 'after',
                    'dose_qty' => 5,
                    'dose_unit' => 'drops',
                    'dilution_note' => 'with half a cup of water',
                    'duration_days' => 7,
                ],
            ],
        ];

        $response = $this->actingAs($admin)->post(route('admin.visits.store'), $payload);
        $response->assertRedirect(route('admin.visits.index'));

        $this->assertDatabaseHas('visits', [
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'chief_complaint' => 'Chronic lower back pain',
        ]);
    }

    public function test_prescription_pdf_view_renders_tables_and_bangla_timings_without_dompdf_flex(): void
    {
        $patient = Patient::create([
            'patient_no' => 102,
            'patient_series' => 'GL',
            'name' => 'Fatima Begum',
            'phone' => '01811223344',
            'gender' => 'female',
            'age_years' => 28,
        ]);

        $doctor = Doctor::create([
            'name' => 'Dr. Rafiqul Islam',
            'credentials' => 'BHMS (DU)',
            'govt_reg_no' => 'H-12345',
            'is_active' => true,
        ]);

        $medicine = Medicine::create([
            'name' => 'Nux Vomica',
            'potency' => '30C',
            'form' => 'drops',
            'is_active' => true,
        ]);

        $user = User::factory()->create();

        $visit = Visit::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'visit_date' => now()->toDateString(),
            'chief_complaint' => 'Digestive distress',
            'status' => 'finalized',
            'created_by' => $user->id,
        ]);

        PrescriptionItem::create([
            'visit_id' => $visit->id,
            'medicine_id' => $medicine->id,
            'sort_order' => 0,
            'timing' => ['morning', 'night'],
            'before_after' => 'after',
            'dose_qty' => 4,
            'dose_unit' => 'drops',
            'dilution_note' => 'with water',
            'duration_days' => 5,
        ]);

        $visit->load(['patient', 'doctor', 'symptoms', 'prescriptionItems.medicine', 'adviceItems', 'foodRestrictions']);
        $settings = ClinicSetting::first();

        // Render blade view
        $html = view('pdf.prescription', [
            'visit' => $visit,
            'settings' => $settings,
        ])->render();

        // Verify dompdf flexbox incompatibility avoidance
        $this->assertStringNotContainsString('display: flex', $html);
        $this->assertStringNotContainsString('display:flex', $html);

        // Verify Bangla timing translation (morning -> সকাল, night -> রাত্রি)
        $this->assertStringContainsString('সকাল', $html);
        $this->assertStringContainsString('রাত্রি', $html);

        // Verify doctor credentials & registration
        $this->assertStringContainsString('Dr. Rafiqul Islam', $html);
        $this->assertStringContainsString('H-12345', $html);
    }

    public function test_clinic_settings_persists_about_content(): void
    {
        $admin = $this->createSuperAdmin();

        $payload = [
            'clinic_name_en' => 'Green Life Updated',
            'clinic_name_bn' => 'গ্রিন লাইফ আপডেটেড',
            'about_text' => 'New about page text in English',
            'about_text_bn' => 'বাংলায় নতুন তথ্য',
            'phone' => '01711998877',
            'address' => 'Mirpur, Dhaka',
            'visiting_hours' => '10 AM - 8 PM',
            'patient_no_series' => 'GL',
            'patient_no_next' => 105,
        ];

        $response = $this->actingAs($admin)->put(route('admin.settings.update'), $payload);
        $response->assertRedirect();

        $this->assertDatabaseHas('clinic_settings', [
            'about_text' => 'New about page text in English',
            'about_text_bn' => 'বাংলায় নতুন তথ্য',
        ]);
    }
}
