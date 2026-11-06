<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AdviceItemController;
use App\Http\Controllers\Admin\AppointmentRequestController as AdminApptController;
use App\Http\Controllers\Admin\ClinicSettingController;
use App\Http\Controllers\Admin\DoctorController;
use App\Http\Controllers\Admin\FoodRestrictionController;
use App\Http\Controllers\Admin\MedicineController;
use App\Http\Controllers\Admin\PatientConfigController;
use App\Http\Controllers\Admin\PatientController;
use App\Http\Controllers\Admin\PatientNumberingProfileController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\PrescriptionOptionController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SymptomController;
use App\Http\Controllers\Admin\SymptomMedicineMapController;
use App\Http\Controllers\Admin\SystemHealthController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VisitController;
use App\Http\Controllers\Admin\VisitDraftController;
use Illuminate\Support\Facades\Route;

// Users (Super Admin only)
Route::middleware(['auth', 'role:Super Admin', 'permission:users.create'])
    ->group(fn () => Route::resource('users', UserController::class)->only(['create', 'store']));
Route::middleware(['auth', 'role:Super Admin', 'permission:users.view'])
    ->group(fn () => Route::resource('users', UserController::class)->only(['index', 'show']));
Route::middleware(['auth', 'role:Super Admin', 'permission:users.update'])
    ->group(fn () => Route::resource('users', UserController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'role:Super Admin', 'permission:users.delete'])
    ->group(fn () => Route::resource('users', UserController::class)->only(['destroy']));

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
Route::middleware(['auth', 'permission:patients.create'])
    ->group(fn () => Route::resource('patients', PatientController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:patients.view'])->group(function () {
    Route::get('patients/search', [PatientController::class, 'search'])->name('patients.search');
    Route::resource('patients', PatientController::class)->only(['index', 'show']);
});
Route::middleware(['auth', 'permission:patients.update'])
    ->group(fn () => Route::resource('patients', PatientController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:patients.delete'])
    ->group(fn () => Route::resource('patients', PatientController::class)->only(['destroy']));

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
    ->put('settings', [ClinicSettingController::class, 'update'])->name('settings.update');

// General settings
Route::middleware(['auth', 'role_or_permission:Super Admin|general_settings.view'])
    ->get('general-settings', [ClinicSettingController::class, 'editGeneral'])->name('general_settings.edit');
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
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.create'])
    ->group(fn () => Route::resource('doctors', DoctorController::class)->only(['create', 'store']));
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.view'])
    ->group(fn () => Route::resource('doctors', DoctorController::class)->only(['index', 'show']));
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.update'])
    ->group(fn () => Route::resource('doctors', DoctorController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'role_or_permission:Super Admin|doctors.delete'])
    ->group(fn () => Route::resource('doctors', DoctorController::class)->only(['destroy']));

// Advice and food restriction changes require their matching settings permission.
Route::middleware(['auth', 'permission:settings.create'])
    ->group(function () {
        Route::resource('advice_items', AdviceItemController::class)->only(['create', 'store']);
        Route::resource('food_restrictions', FoodRestrictionController::class)->only(['create', 'store']);
    });

Route::middleware(['auth', 'permission:settings.update'])
    ->group(function () {
        Route::resource('advice_items', AdviceItemController::class)->only(['edit', 'update']);
        Route::resource('food_restrictions', FoodRestrictionController::class)->only(['edit', 'update']);
    });

Route::middleware(['auth', 'permission:settings.delete'])
    ->group(function () {
        Route::resource('advice_items', AdviceItemController::class)->only(['destroy']);
        Route::resource('food_restrictions', FoodRestrictionController::class)->only(['destroy']);
    });

Route::middleware(['auth', 'permission:settings.view'])
    ->group(function () {
        Route::resource('advice_items', AdviceItemController::class)->only(['index', 'show']);
        Route::resource('food_restrictions', FoodRestrictionController::class)->only(['index', 'show']);
    });

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
        ->middleware('throttle:2,1')
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
    Route::post('/system-health/maintenance/clear-caches', [SystemHealthController::class, 'clearCaches'])
        ->middleware('throttle:2,1')
        ->name('system_health.clear_caches');
});

// Appointments
Route::middleware(['auth', 'permission:appointments.view'])->group(function () {
    Route::get('/appointment-requests', [AdminApptController::class, 'index'])->name('appointment_requests.index');
});
Route::middleware(['auth', 'permission:appointments.update'])->group(function () {
    Route::put('/appointment-requests/{appointmentRequest}', [AdminApptController::class, 'update'])->name('appointment_requests.update');
    Route::post('/appointment-requests/{appointmentRequest}/convert', [AdminApptController::class, 'convertToPatient'])->name('appointment_requests.convert');
});
