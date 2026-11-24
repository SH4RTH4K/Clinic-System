<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AdviceItemController;
use App\Http\Controllers\Admin\AppointmentRequestController as AdminApptController;
use App\Http\Controllers\Admin\CalendarController;
use App\Http\Controllers\Admin\ClinicSettingController;
use App\Http\Controllers\Admin\CommunicationController;
use App\Http\Controllers\Admin\DoctorController;
use App\Http\Controllers\Admin\DoctorScheduleController;
use App\Http\Controllers\Admin\FoodRestrictionController;
use App\Http\Controllers\Admin\GitRepositoryController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\LabInvestigationController;
use App\Http\Controllers\Admin\MedicineController;
use App\Http\Controllers\Admin\PatientAttachmentController;
use App\Http\Controllers\Admin\PatientConfigController;
use App\Http\Controllers\Admin\PatientController;
use App\Http\Controllers\Admin\PatientNumberingProfileController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\PharmaceuticalController;
use App\Http\Controllers\Admin\PrescriptionOptionController;
use App\Http\Controllers\Admin\QueueController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SymptomController;
use App\Http\Controllers\Admin\SymptomMedicineMapController;
use App\Http\Controllers\Admin\SystemHealthController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VisitController;
use App\Http\Controllers\Admin\VisitDraftController;
use App\Http\Controllers\DoctorPhotoController;
use Illuminate\Support\Facades\Route;

// User administration is restricted to the Super Admin role.
Route::middleware(['auth', 'role:Super Admin'])
    ->group(fn () => Route::resource('users', UserController::class)->only([
        'create', 'store', 'index', 'show', 'edit', 'update', 'destroy',
    ]));

// Roles (Super Admin only)
Route::middleware(['auth', 'role:Super Admin', 'permission:roles.create'])
    ->group(fn () => Route::resource('roles', RoleController::class)->only(['create', 'store']));
Route::middleware(['auth', 'role:Super Admin', 'permission:roles.view'])
    ->group(fn () => Route::resource('roles', RoleController::class)->only(['index']));
Route::middleware(['auth', 'role:Super Admin', 'permission:roles.update'])
    ->group(fn () => Route::resource('roles', RoleController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'role:Super Admin', 'permission:roles.delete'])
    ->group(fn () => Route::resource('roles', RoleController::class)->only(['destroy']));

// Permission assignments are managed separately from role details.
Route::middleware(['auth', 'role:Super Admin', 'permission:roles.view'])
    ->get('permissions', [PermissionController::class, 'index'])->name('permissions.index');
Route::middleware(['auth', 'role:Super Admin', 'permission:roles.update'])
    ->put('permissions/{role}', [PermissionController::class, 'update'])->name('permissions.update');

// Patients
Route::middleware(['auth', 'role_or_permission:Super Admin|patients.create'])
    ->group(fn () => Route::resource('patients', PatientController::class)->only(['create', 'store']));
Route::middleware(['auth', 'role_or_permission:Super Admin|patients.view'])->group(function () {
    Route::get('patients/export', [PatientController::class, 'export'])->name('patients.export');
    Route::get('patients/search', [PatientController::class, 'search'])->name('patients.search');
    Route::get('patients/{patient}/opd-card', [PatientController::class, 'opdCard'])->name('patients.opd_card');
    Route::get('patients/{patient}/photo', [PatientController::class, 'photo'])->name('patients.photo');
    Route::resource('patients', PatientController::class)->only(['index', 'show']);
});
Route::middleware(['auth', 'role_or_permission:Super Admin|patients.update'])
    ->group(fn () => Route::resource('patients', PatientController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'role_or_permission:Super Admin|patients.delete'])
    ->group(fn () => Route::resource('patients', PatientController::class)->only(['destroy']));

// Patient Attachments & Diagnostic Reports
Route::middleware(['auth', 'permission:attachments.create'])
    ->post('patients/{patient}/attachments', [PatientAttachmentController::class, 'store'])
    ->name('patients.attachments.store');
Route::middleware(['auth', 'permission:attachments.view'])->group(function () {
    Route::get('attachments/{attachment}/view', [PatientAttachmentController::class, 'show'])->name('attachments.show');
    Route::get('attachments/{attachment}/download', [PatientAttachmentController::class, 'download'])->name('attachments.download');
});
Route::middleware(['auth', 'permission:attachments.delete'])
    ->delete('attachments/{attachment}', [PatientAttachmentController::class, 'destroy'])
    ->name('attachments.destroy');

// Patient form configuration
Route::middleware(['auth', 'role_or_permission:Super Admin|patient_config.view'])
    ->get('patient-config', [PatientConfigController::class, 'edit'])->name('patient_config.edit');
Route::middleware(['auth', 'role_or_permission:Super Admin|patient_config.create|patient_config.update|patient_config.order'])
    ->put('patient-config', [PatientConfigController::class, 'update'])->name('patient_config.update');
Route::middleware(['auth', 'role_or_permission:Super Admin|patient_config.delete'])
    ->delete('patient-config/relationships/{relationship}', [PatientConfigController::class, 'destroyRelationship'])
    ->name('patient_config.relationships.destroy');

// Medicines
Route::middleware(['auth', 'permission:medicines.create'])
    ->group(fn () => Route::resource('medicines', MedicineController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:medicines.view'])
    ->group(fn () => Route::resource('medicines', MedicineController::class)->only(['index', 'show']));
Route::middleware(['auth', 'permission:medicines.update'])
    ->group(fn () => Route::resource('medicines', MedicineController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:medicines.delete'])
    ->group(fn () => Route::resource('medicines', MedicineController::class)->only(['destroy']));

// Pharmaceuticals (General Practice & Dual Mode Catalog)
Route::middleware(['auth', 'permission:pharmaceuticals.create'])
    ->group(fn () => Route::resource('pharmaceuticals', PharmaceuticalController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:pharmaceuticals.view'])->group(function () {
    Route::get('pharmaceuticals/search', [PharmaceuticalController::class, 'search'])->name('pharmaceuticals.search');
    Route::resource('pharmaceuticals', PharmaceuticalController::class)->only(['index', 'show']);
});
Route::middleware(['auth', 'permission:pharmaceuticals.update'])
    ->group(fn () => Route::resource('pharmaceuticals', PharmaceuticalController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:pharmaceuticals.delete'])
    ->group(fn () => Route::resource('pharmaceuticals', PharmaceuticalController::class)->only(['destroy']));

// Diagnostic Lab Investigations
Route::middleware(['auth', 'permission:lab_investigations.create'])
    ->group(fn () => Route::resource('lab-investigations', LabInvestigationController::class)->only(['create', 'store'])->names('lab_investigations'));
Route::middleware(['auth', 'permission:lab_investigations.view'])->group(function () {
    Route::get('lab-investigations/search', [LabInvestigationController::class, 'search'])->name('lab_investigations.search');
    Route::resource('lab-investigations', LabInvestigationController::class)->only(['index', 'show'])->names('lab_investigations');
});
Route::middleware(['auth', 'permission:lab_investigations.update'])
    ->group(fn () => Route::resource('lab-investigations', LabInvestigationController::class)->only(['edit', 'update'])->names('lab_investigations'));
Route::middleware(['auth', 'permission:lab_investigations.delete'])
    ->group(fn () => Route::resource('lab-investigations', LabInvestigationController::class)->only(['destroy'])->names('lab_investigations'));

// Pharmacy Inventory & Stock Control
Route::middleware(['auth', 'permission:inventory.view'])->group(function () {
    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('inventory/transactions', [InventoryController::class, 'transactions'])->name('inventory.transactions');
});
Route::middleware(['auth', 'permission:inventory.create'])->group(function () {
    Route::get('inventory/create', [InventoryController::class, 'create'])->name('inventory.create');
    Route::post('inventory', [InventoryController::class, 'store'])->name('inventory.store');
});
Route::middleware(['auth', 'permission:inventory.update'])->group(function () {
    Route::get('inventory/{batch}/edit', [InventoryController::class, 'edit'])->name('inventory.edit');
    Route::put('inventory/{batch}', [InventoryController::class, 'update'])->name('inventory.update');
    Route::post('inventory/{batch}/adjust', [InventoryController::class, 'adjust'])->name('inventory.adjust');
});
Route::middleware(['auth', 'permission:inventory.delete'])
    ->delete('inventory/{batch}', [InventoryController::class, 'destroy'])
    ->name('inventory.destroy');

// Symptoms
Route::middleware(['auth', 'permission:symptoms.create'])
    ->group(fn () => Route::resource('symptoms', SymptomController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:symptoms.view'])
    ->group(fn () => Route::resource('symptoms', SymptomController::class)->only(['index', 'show']));
Route::middleware(['auth', 'permission:symptoms.update'])
    ->group(fn () => Route::resource('symptoms', SymptomController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:symptoms.delete'])
    ->group(fn () => Route::resource('symptoms', SymptomController::class)->only(['destroy']));

// Visits
Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.create'])
    ->get('visits/draft', [VisitDraftController::class, 'show'])
    ->name('visits.draft.show')
    ->middleware('cache.headers:private;no_store');
Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.create'])
    ->put('visits/draft', [VisitDraftController::class, 'update'])
    ->name('visits.draft.update');
Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.create'])
    ->delete('visits/draft', [VisitDraftController::class, 'destroy'])
    ->name('visits.draft.destroy');

Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.create'])
    ->group(function () {
        Route::get('visits/create', [VisitController::class, 'create'])
            ->name('visits.create')
            ->middleware('cache.headers:private;no_store');
        Route::resource('visits', VisitController::class)->only(['store']);
    });
Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.finalize'])
    ->post('visits/finalize', [VisitController::class, 'finalize'])
    ->name('visits.finalize');
Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.finalize'])
    ->post('visits/{visit}/finalize', [VisitController::class, 'finalize'])
    ->name('visits.finalize_draft');
Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.view', 'permission:visits.cancel'])
    ->post('visits/{visit}/cancel-prescription', [VisitController::class, 'cancelPrescription'])
    ->name('visits.cancel_prescription');
Route::middleware(['auth', 'clinical_record_access:visits.view'])->group(function () {
    Route::get('visits/suggestions', [VisitController::class, 'suggestions'])->name('visits.suggestions');
    Route::resource('visits', VisitController::class)->only(['index', 'show']);
});
Route::middleware(['auth', 'clinical_record_access:visits.export'])
    ->get('visits/{visit}/pdf', [VisitController::class, 'pdf'])
    ->name('visits.pdf')
    ->middleware('cache.headers:private;no_store');
Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.update|visits.amend'])
    ->group(fn () => Route::resource('visits', VisitController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:clinical_records.view', 'permission:visits.delete'])
    ->group(fn () => Route::resource('visits', VisitController::class)->only(['destroy']));

// Symptom-Medicine Map
Route::middleware(['auth', 'permission:symptom_medicine_map.create'])
    ->group(fn () => Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:symptom_medicine_map.view'])->group(function () {
    Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['index']);
});
Route::middleware(['auth', 'permission:symptom_medicine_map.update'])
    ->post('symptom_medicine_map/{symptom_medicine_map}/submit-review', [SymptomMedicineMapController::class, 'submitForReview'])->name('symptom_medicine_map.submit_review');
Route::middleware(['auth', 'permission:symptom_medicine_map.review'])
    ->post('symptom_medicine_map/{symptom_medicine_map}/review', [SymptomMedicineMapController::class, 'review'])->name('symptom_medicine_map.review');
Route::middleware(['auth', 'permission:symptom_medicine_map.update'])
    ->post('symptom_medicine_map/{mapping}/restore', [SymptomMedicineMapController::class, 'restore'])->name('symptom_medicine_map.restore');
Route::middleware(['auth', 'permission:symptom_medicine_map.update|symptom_medicine_map.review'])
    ->group(fn () => Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:symptom_medicine_map.create'])
    ->post('symptom_medicine_map/import', [SymptomMedicineMapController::class, 'previewImport'])->name('symptom_medicine_map.import');
Route::middleware(['auth', 'permission:symptom_medicine_map.create'])
    ->post('symptom_medicine_map/import/confirm', [SymptomMedicineMapController::class, 'confirmImport'])->name('symptom_medicine_map.import.confirm');
Route::middleware(['auth', 'permission:symptom_medicine_map.delete'])
    ->group(fn () => Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['destroy']));

// Clinic settings
Route::middleware(['auth', 'role:Super Admin', 'permission:clinic_settings.view'])
    ->get('settings', [ClinicSettingController::class, 'edit'])->name('settings.edit');
Route::middleware(['auth', 'role:Super Admin', 'permission:clinic_settings.update'])
    ->match(['put', 'post'], 'settings', [ClinicSettingController::class, 'update'])->name('settings.update');

// General settings
Route::middleware(['auth', 'role_or_permission:Super Admin|general_settings.view'])
    ->get('general-settings', [ClinicSettingController::class, 'editGeneral'])->name('general_settings.edit');
Route::middleware(['auth', 'role_or_permission:Super Admin|general_settings.update'])
    ->put('general-settings/old-id-config', [ClinicSettingController::class, 'updateOldOrOtherIdConfig'])->name('general_settings.old_id_config.update');
Route::middleware(['auth', 'role_or_permission:Super Admin|general_settings.create'])
    ->post('general-settings/numbering-profiles', [PatientNumberingProfileController::class, 'store'])->name('general_settings.profiles.store');
Route::middleware(['auth', 'role_or_permission:Super Admin|general_settings.update'])
    ->put('general-settings/numbering-profiles/{profile}', [PatientNumberingProfileController::class, 'update'])->name('general_settings.profiles.update');
Route::middleware(['auth', 'role_or_permission:Super Admin|general_settings.delete'])
    ->delete('general-settings/numbering-profiles/{profile}', [PatientNumberingProfileController::class, 'destroy'])->name('general_settings.profiles.destroy');

// Prescription options
Route::middleware(['auth', 'role_or_permission:Super Admin|prescription_options.view'])
    ->get('prescription-options', [PrescriptionOptionController::class, 'edit'])->name('prescription_options.edit');
Route::middleware(['auth', 'role_or_permission:Super Admin|prescription_options.create|prescription_options.update|prescription_options.delete'])
    ->put('prescription-options', [PrescriptionOptionController::class, 'update'])->name('prescription_options.update');
Route::middleware(['auth', 'role_or_permission:Super Admin|prescription_options.create|prescription_options.update|prescription_options.delete'])
    ->put('settings/prescription-config', [PrescriptionOptionController::class, 'update'])->name('settings.prescription_config');

// Doctor profiles
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.view'])
    ->get('doctors/{doctor}/photo', [DoctorPhotoController::class, 'showAdmin'])->name('doctors.photo');
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.create'])
    ->group(fn () => Route::resource('doctors', DoctorController::class)->only(['create', 'store']));
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.view'])
    ->group(fn () => Route::resource('doctors', DoctorController::class)->only(['index', 'show']));
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.update'])
    ->group(fn () => Route::resource('doctors', DoctorController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.delete'])
    ->group(fn () => Route::resource('doctors', DoctorController::class)->only(['destroy']));

// Keep shared settings permissions as a compatibility path for existing role assignments.
Route::middleware(['auth', 'permission:advice_items.create|settings.create'])
    ->group(fn () => Route::resource('advice_items', AdviceItemController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:advice_items.update|settings.update'])
    ->group(fn () => Route::resource('advice_items', AdviceItemController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:advice_items.delete|settings.delete'])
    ->group(fn () => Route::resource('advice_items', AdviceItemController::class)->only(['destroy']));
Route::middleware(['auth', 'permission:advice_items.view|settings.view'])
    ->group(fn () => Route::resource('advice_items', AdviceItemController::class)->only(['index', 'show']));

Route::middleware(['auth', 'permission:food_restrictions.create|settings.create'])
    ->group(fn () => Route::resource('food_restrictions', FoodRestrictionController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:food_restrictions.update|settings.update'])
    ->group(fn () => Route::resource('food_restrictions', FoodRestrictionController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:food_restrictions.delete|settings.delete'])
    ->group(fn () => Route::resource('food_restrictions', FoodRestrictionController::class)->only(['destroy']));
Route::middleware(['auth', 'permission:food_restrictions.view|settings.view'])
    ->group(fn () => Route::resource('food_restrictions', FoodRestrictionController::class)->only(['index', 'show']));

// Reports
Route::middleware([
    'auth',
    'permission:clinical_records.view',
    'permission:patients.view',
    'permission:visits.view',
    'permission:reports.view',
])
    ->group(fn () => Route::get('/reports', [ReportController::class, 'index'])->name('reports.index'));

// Activity Logs
Route::middleware(['auth', 'permission:activity_logs.view', 'role:Super Admin'])
    ->group(fn () => Route::get('/activity-logs', [ActivityLogController::class, 'index'])->name('activity_logs.index'));

// System health and backup maintenance are restricted to Super Admins and explicitly authorized managers.
Route::middleware(['auth', 'role_or_permission:Super Admin|system_health.manage'])->group(function () {
    Route::get('/system-health', [SystemHealthController::class, 'index'])->name('system_health.index');
    Route::post('/system-health/backups', [SystemHealthController::class, 'backup'])
        ->middleware('system_health_backup_rate_limit')
        ->name('system_health.backup');
    Route::post('/system-health/backup-schedule', [SystemHealthController::class, 'updateBackupSchedule'])
        ->middleware('throttle:6,1')
        ->name('system_health.backup_schedule');
    Route::get('/system-health/backups/{filename}', [SystemHealthController::class, 'download'])
        ->where('filename', '[A-Za-z0-9_.-]+')
        ->name('system_health.backups.download');
    Route::delete('/system-health/backups/{filename}', [SystemHealthController::class, 'destroyBackup'])
        ->where('filename', '[A-Za-z0-9_.-]+')
        ->middleware(['role:Super Admin', 'throttle:10,1'])
        ->name('system_health.backups.destroy');
    Route::post('/system-health/restores', [SystemHealthController::class, 'restore'])
        ->middleware(['role:Super Admin', 'throttle:2,1'])
        ->name('system_health.restore');
    Route::post('/system-health/reset-as-new', [SystemHealthController::class, 'resetAsNew'])
        ->middleware(['role:Super Admin', 'throttle:1,10'])
        ->name('system_health.reset_as_new');
    Route::post('/system-health/maintenance/clear-caches', [SystemHealthController::class, 'clearCaches'])
        ->middleware('throttle:2,1')
        ->name('system_health.clear_caches');
});

// Repository operations can change deployed application source and are Super Admin only.
Route::middleware(['auth', 'role:Super Admin'])->prefix('system/git-repository')->name('git_repository.')->group(function () {
    Route::get('/', [GitRepositoryController::class, 'index'])->name('index');
    Route::post('/settings', [GitRepositoryController::class, 'updateSettings'])->middleware('throttle:6,1')->name('settings');
    Route::post('/check', [GitRepositoryController::class, 'check'])->middleware('throttle:6,1')->name('check');
    Route::post('/reconnect-source', [GitRepositoryController::class, 'reconnectSourceCheckout'])->middleware('throttle:6,1')->name('reconnect_source');
    Route::post('/initialize', [GitRepositoryController::class, 'initializeCheckout'])->middleware('throttle:6,1')->name('initialize');
    Route::post('/pull', [GitRepositoryController::class, 'pull'])->middleware('throttle:6,1')->name('pull');

    // Database & Migrations Management
    Route::post('/database/migrate', [GitRepositoryController::class, 'runMigrations'])->middleware('throttle:10,1')->name('database.migrate');
    Route::post('/database/rollback', [GitRepositoryController::class, 'rollbackMigrations'])->middleware('throttle:6,1')->name('database.rollback');
    Route::post('/database/remigrate', [GitRepositoryController::class, 'remigrateMigrations'])->middleware('throttle:6,1')->name('database.remigrate');
    Route::post('/database/clear-caches', [GitRepositoryController::class, 'clearCaches'])->middleware('throttle:10,1')->name('database.clear_caches');
    Route::post('/database/rebuild-caches', [GitRepositoryController::class, 'rebuildCaches'])->middleware('throttle:10,1')->name('database.rebuild_caches');
});

// Appointments
Route::middleware(['auth', 'role_or_permission:Super Admin|appointments.view'])->group(function () {
    Route::get('/appointment-requests', [AdminApptController::class, 'index'])->name('appointment_requests.index');
});
Route::middleware(['auth', 'role_or_permission:Super Admin|appointments.create'])->group(function () {
    Route::get('/appointment-requests/create', [AdminApptController::class, 'create'])->name('appointment_requests.create');
    Route::post('/appointment-requests', [AdminApptController::class, 'store'])->name('appointment_requests.store');
});
Route::middleware(['auth', 'role_or_permission:Super Admin|appointments.update'])->group(function () {
    Route::get('/appointment-requests/{appointmentRequest}/edit', [AdminApptController::class, 'edit'])->name('appointment_requests.edit');
    Route::put('/appointment-requests/{appointmentRequest}', [AdminApptController::class, 'update'])->name('appointment_requests.update');
    Route::post('/appointment-requests/{appointmentRequest}/convert', [AdminApptController::class, 'convertToPatient'])->name('appointment_requests.convert');
    Route::post('/appointment-requests/{appointmentRequest}/link-patient', [AdminApptController::class, 'linkExistingPatient'])->name('appointment_requests.link_patient');
});
Route::delete('/appointment-requests/{appointmentRequest}', [AdminApptController::class, 'destroy'])
    ->middleware(['auth', 'role_or_permission:Super Admin|appointments.delete'])
    ->name('appointment_requests.destroy');

// Billing, Invoicing & Cash Register
Route::middleware(['auth', 'role_or_permission:Super Admin|billing.create'])->group(function () {
    Route::get('/invoices/create', [InvoiceController::class, 'create'])->name('invoices.create');
    Route::get('/invoices/patient-visits/{patient}', [InvoiceController::class, 'patientVisits'])->name('invoices.patient_visits');
    Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
    Route::post('/invoices/{invoice}/payments', [InvoiceController::class, 'recordPayment'])->name('invoices.payments.store');
});
Route::middleware(['auth', 'role_or_permission:Super Admin|billing.view'])->group(function () {
    Route::get('/billing/cash-register', [InvoiceController::class, 'cashRegister'])->name('billing.cash_register');
    Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])->name('invoices.show');
    Route::get('/invoices/{invoice}/print', [InvoiceController::class, 'print'])->name('invoices.print');
    Route::get('/invoices/{invoice}/pos-receipt', [InvoiceController::class, 'posReceipt'])->name('invoices.pos_receipt');
});
Route::middleware(['auth', 'role_or_permission:Super Admin|billing.update'])->group(function () {
    Route::get('/invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('invoices.edit');
    Route::put('/invoices/{invoice}', [InvoiceController::class, 'update'])->name('invoices.update');
});
Route::middleware(['auth', 'role_or_permission:Super Admin|billing.delete'])->group(function () {
    Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])->name('invoices.destroy');
});

// Waiting Room Queue Management
Route::middleware(['auth', 'role_or_permission:Super Admin|queue.view'])->group(function () {
    Route::get('/queue', [QueueController::class, 'index'])->name('queue.index');
    Route::get('/queue/display', [QueueController::class, 'display'])->name('queue.display');
    Route::get('/queue/workbench', [QueueController::class, 'workbench'])->name('queue.workbench');
    Route::get('/queue/live-state', [QueueController::class, 'liveData'])->name('queue.live_state');
    Route::get('/queue/tokens/{token}/print', [QueueController::class, 'printToken'])->name('queue.tokens.print');
});

Route::middleware(['auth', 'role_or_permission:Super Admin|queue.manage'])->group(function () {
    Route::get('/queue/tokens/create', [QueueController::class, 'create'])->name('queue.tokens.create');
    Route::post('/queue/tokens', [QueueController::class, 'store'])->name('queue.tokens.store');
    Route::post('/queue/tokens/{token}/call', [QueueController::class, 'call'])->name('queue.tokens.call');
    Route::post('/queue/tokens/{token}/recall', [QueueController::class, 'recall'])->name('queue.tokens.recall');
    Route::post('/queue/tokens/{token}/start-consultation', [QueueController::class, 'startConsultation'])->name('queue.tokens.start_consultation');
    Route::post('/queue/tokens/{token}/complete', [QueueController::class, 'complete'])->name('queue.tokens.complete');
    Route::post('/queue/tokens/{token}/skip', [QueueController::class, 'skip'])->name('queue.tokens.skip');
    Route::delete('/queue/tokens/{token}', [QueueController::class, 'destroy'])->name('queue.tokens.destroy');
});

// Doctor Schedules & Visual Calendar
Route::middleware(['auth', 'role_or_permission:Super Admin|calendar.view'])->group(function () {
    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar.index');
    Route::get('/calendar/events', [CalendarController::class, 'events'])->name('calendar.events');
    Route::get('/doctor-schedules', [DoctorScheduleController::class, 'index'])->name('doctor_schedules.index');
});

Route::middleware(['auth', 'role_or_permission:Super Admin|calendar.manage'])->group(function () {
    Route::put('/doctor-schedules/{doctor}', [DoctorScheduleController::class, 'update'])->name('doctor_schedules.update');
    Route::post('/doctor-schedules/{doctor}/leaves', [DoctorScheduleController::class, 'storeLeave'])->name('doctor_schedules.leaves.store');
    Route::delete('/doctor-schedules/leaves/{leave}', [DoctorScheduleController::class, 'destroyLeave'])->name('doctor_schedules.leaves.destroy');
});

// Patient Communications (SMS & WhatsApp logs)
Route::middleware(['auth', 'role_or_permission:Super Admin|communications.view'])->group(function () {
    Route::get('/communications', [CommunicationController::class, 'index'])->name('communications.index');
    Route::get('/visits/{visit}/whatsapp-url', [CommunicationController::class, 'whatsappUrl'])->name('visits.whatsapp_url');
});

Route::middleware(['auth', 'role_or_permission:Super Admin|communications.send'])->group(function () {
    Route::post('/communications/send-custom', [CommunicationController::class, 'sendCustom'])->name('communications.send_custom');
});

Route::middleware(['auth', 'role_or_permission:Super Admin|communications.manage'])->group(function () {
    Route::get('/communications/settings', [CommunicationController::class, 'settings'])->name('communications.settings');
    Route::put('/communications/settings', [CommunicationController::class, 'updateSettings'])->name('communications.settings.update');
});
