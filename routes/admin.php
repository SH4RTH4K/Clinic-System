<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AdviceItemController;
use App\Http\Controllers\Admin\AppointmentRequestController as AdminApptController;
use App\Http\Controllers\Admin\ClinicSettingController;
use App\Http\Controllers\Admin\DoctorController;
use App\Http\Controllers\Admin\FoodRestrictionController;
use App\Http\Controllers\Admin\MedicineController;
use App\Http\Controllers\Admin\PatientController;
use App\Http\Controllers\Admin\PrescriptionOptionController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SymptomController;
use App\Http\Controllers\Admin\SymptomMedicineMapController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VisitController;
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
    ->group(fn () => Route::resource('roles', RoleController::class)->only(['index', 'show']));
Route::middleware(['auth', 'role:Super Admin', 'permission:roles.update'])
    ->group(fn () => Route::resource('roles', RoleController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'role:Super Admin', 'permission:roles.delete'])
    ->group(fn () => Route::resource('roles', RoleController::class)->only(['destroy']));

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
Route::middleware(['auth', 'permission:visits.create'])
    ->group(fn () => Route::resource('visits', VisitController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:visits.view'])->group(function () {
    Route::get('visits/suggestions', [VisitController::class, 'suggestions'])->name('visits.suggestions');
    Route::get('visits/{visit}/pdf', [VisitController::class, 'pdf'])->name('visits.pdf');
    Route::resource('visits', VisitController::class)->only(['index', 'show']);
});
Route::middleware(['auth', 'permission:visits.update'])
    ->group(fn () => Route::resource('visits', VisitController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:visits.delete'])
    ->group(fn () => Route::resource('visits', VisitController::class)->only(['destroy']));

// Symptom-Medicine Map
Route::middleware(['auth', 'permission:symptom_medicine_map.create'])
    ->group(fn () => Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:symptom_medicine_map.view'])->group(function () {
    Route::post('symptom_medicine_map/import', [SymptomMedicineMapController::class, 'import'])->name('symptom_medicine_map.import');
    Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['index']);
});
Route::middleware(['auth', 'permission:symptom_medicine_map.delete'])
    ->group(fn () => Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['destroy']));

// Settings & Related Entities
Route::middleware(['auth', 'permission:settings.update'])
    ->group(function () {
        Route::put('settings', [ClinicSettingController::class, 'update'])->name('settings.update');
        Route::put('settings/prescription-config', [ClinicSettingController::class, 'updatePrescriptionConfig'])->name('settings.prescription_config');
        Route::put('prescription-options', [PrescriptionOptionController::class, 'update'])->name('prescription_options.update');
        Route::resource('doctors', DoctorController::class)->only(['create', 'store', 'edit', 'update', 'destroy']);
        Route::resource('advice_items', AdviceItemController::class)->only(['create', 'store', 'edit', 'update', 'destroy']);
        Route::resource('food_restrictions', FoodRestrictionController::class)->only(['create', 'store', 'edit', 'update', 'destroy']);
    });

Route::middleware(['auth', 'permission:settings.view'])
    ->group(function () {
        Route::get('settings', [ClinicSettingController::class, 'edit'])->name('settings.edit');
        Route::get('prescription-options', [PrescriptionOptionController::class, 'edit'])->name('prescription_options.edit');
        Route::resource('doctors', DoctorController::class)->only(['index', 'show']);
        Route::resource('advice_items', AdviceItemController::class)->only(['index', 'show']);
        Route::resource('food_restrictions', FoodRestrictionController::class)->only(['index', 'show']);
    });

// Reports
Route::middleware(['auth', 'permission:reports.view'])
    ->group(fn () => Route::get('/reports', [ReportController::class, 'index'])->name('reports.index'));

// Activity Logs
Route::middleware(['auth', 'permission:activity_logs.view'])
    ->group(fn () => Route::get('/activity-logs', [ActivityLogController::class, 'index'])->name('activity_logs.index'));

// Appointments
Route::middleware(['auth', 'permission:appointments.view'])->group(function () {
    Route::get('/appointment-requests', [AdminApptController::class, 'index'])->name('appointment_requests.index');
});
Route::middleware(['auth', 'permission:appointments.update'])->group(function () {
    Route::put('/appointment-requests/{appointmentRequest}', [AdminApptController::class, 'update'])->name('appointment_requests.update');
    Route::post('/appointment-requests/{appointmentRequest}/convert', [AdminApptController::class, 'convertToPatient'])->name('appointment_requests.convert');
});
