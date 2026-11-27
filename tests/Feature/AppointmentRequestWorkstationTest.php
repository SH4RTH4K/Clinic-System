<?php

namespace Tests\Feature;

use App\Models\AppointmentRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AppointmentRequestWorkstationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();

        $permissions = [
            'appointments.view',
            'appointments.create',
            'appointments.update',
            'appointments.delete',
            'patients.view',
            'patients.create',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->givePermissionTo(Permission::all());
    }

    public function test_unauthenticated_user_cannot_access_appointment_requests(): void
    {
        $response = $this->get(route('admin.appointment_requests.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_unauthorized_user_receives_403_forbidden(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);

        $response = $this->actingAs($user)->get(route('admin.appointment_requests.index'));
        $response->assertForbidden();
    }

    public function test_super_admin_can_view_appointment_requests_workstation_with_kpis(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        AppointmentRequest::create([
            'name' => 'Test Patient',
            'phone' => '01710000000',
            'status' => 'pending',
            'source' => 'website',
        ]);

        $response = $this->actingAs($superAdmin)->get(route('admin.appointment_requests.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/AppointmentRequests/Index')
            ->has('requests')
            ->has('kpis', fn (Assert $kpi) => $kpi
                ->has('total_requests')
                ->has('pending_triage')
                ->has('contacted')
                ->has('scheduled_today')
                ->has('converted_patients')
            )
            ->has('filters', fn (Assert $f) => $f
                ->has('status')
                ->has('search')
                ->has('date_preset')
            )
        );
    }

    public function test_search_filter_matches_patient_name_and_phone(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        AppointmentRequest::create([
            'name' => 'Sharthok Roy',
            'phone' => '01711223344',
            'status' => 'pending',
            'source' => 'website',
        ]);

        AppointmentRequest::create([
            'name' => 'Tanvir Ahmed',
            'phone' => '01899887766',
            'status' => 'pending',
            'source' => 'phone',
        ]);

        // Search by name
        $responseName = $this->actingAs($superAdmin)->get(route('admin.appointment_requests.index', [
            'search' => 'Sharthok',
        ]));
        $responseName->assertOk();
        $responseName->assertInertia(fn (Assert $page) => $page
            ->has('requests.data', 1)
            ->where('requests.data.0.name', 'Sharthok Roy')
        );

        // Search by phone
        $responsePhone = $this->actingAs($superAdmin)->get(route('admin.appointment_requests.index', [
            'search' => '01899',
        ]));
        $responsePhone->assertOk();
        $responsePhone->assertInertia(fn (Assert $page) => $page
            ->has('requests.data', 1)
            ->where('requests.data.0.name', 'Tanvir Ahmed')
        );
    }

    public function test_date_preset_filter_for_today_matches_today_appointments(): void
    {
        $superAdmin = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $superAdmin->assignRole('Super Admin');

        $today = Carbon::today()->toDateString();
        $nextMonth = Carbon::today()->addMonth()->toDateString();

        AppointmentRequest::create([
            'name' => 'Today Patient',
            'phone' => '01711001122',
            'scheduled_date' => $today,
            'scheduled_time' => '10:00:00',
            'status' => 'scheduled',
            'source' => 'website',
        ]);

        AppointmentRequest::create([
            'name' => 'Next Month Patient',
            'phone' => '01799001122',
            'scheduled_date' => $nextMonth,
            'scheduled_time' => '11:00:00',
            'status' => 'scheduled',
            'source' => 'website',
        ]);

        $response = $this->actingAs($superAdmin)->get(route('admin.appointment_requests.index', [
            'date_preset' => 'today',
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->has('requests.data', 1)
            ->where('requests.data.0.name', 'Today Patient')
        );
    }

    public function test_quick_status_updates_status_and_records_audit_event(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['appointments.view', 'appointments.update']);

        $request = AppointmentRequest::create([
            'name' => 'Pending Patient',
            'phone' => '01755667788',
            'status' => 'pending',
            'source' => 'website',
        ]);

        $response = $this->actingAs($user)->patch(route('admin.appointment_requests.quick_status', $request), [
            'status' => 'contacted',
        ]);

        $response->assertSessionHas('success');
        $this->assertEquals('contacted', $request->fresh()->status);
        $this->assertEquals($user->id, $request->fresh()->handled_by);

        $this->assertDatabaseHas('appointment_request_events', [
            'appointment_request_id' => $request->id,
            'performed_by' => $user->id,
            'event_type' => 'status_changed',
            'previous_status' => 'pending',
            'new_status' => 'contacted',
        ]);
    }

    public function test_user_without_update_permission_cannot_use_quick_status(): void
    {
        $user = User::factory()->create(['is_active' => true, 'must_change_password' => false]);
        $user->givePermissionTo(['appointments.view']); // No update permission

        $request = AppointmentRequest::create([
            'name' => 'Pending Patient',
            'phone' => '01755667788',
            'status' => 'pending',
            'source' => 'website',
        ]);

        $response = $this->actingAs($user)->patch(route('admin.appointment_requests.quick_status', $request), [
            'status' => 'contacted',
        ]);

        $response->assertForbidden();
    }
}
