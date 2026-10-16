<?php

use App\Http\Controllers\Admin\MedicineController;
use App\Http\Controllers\Admin\PatientController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SymptomController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'permission:users.view'])->group(function () {
    Route::resource('users', UserController::class);
});

Route::middleware(['auth', 'permission:roles.view'])->group(function () {
    Route::resource('roles', RoleController::class);
});

Route::middleware(['auth', 'permission:patients.view'])->group(fn () => Route::resource('patients', PatientController::class)->only(['index', 'show']));
Route::middleware(['auth', 'permission:patients.create'])->group(fn () => Route::resource('patients', PatientController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:patients.update'])->group(fn () => Route::resource('patients', PatientController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:patients.delete'])->group(fn () => Route::resource('patients', PatientController::class)->only(['destroy']));

Route::middleware(['auth', 'permission:medicines.view'])->group(fn () => Route::resource('medicines', MedicineController::class)->only(['index', 'show']));
Route::middleware(['auth', 'permission:medicines.create'])->group(fn () => Route::resource('medicines', MedicineController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:medicines.update'])->group(fn () => Route::resource('medicines', MedicineController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:medicines.delete'])->group(fn () => Route::resource('medicines', MedicineController::class)->only(['destroy']));

Route::middleware(['auth', 'permission:symptoms.view'])->group(fn () => Route::resource('symptoms', SymptomController::class)->only(['index', 'show']));
Route::middleware(['auth', 'permission:symptoms.create'])->group(fn () => Route::resource('symptoms', SymptomController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:symptoms.update'])->group(fn () => Route::resource('symptoms', SymptomController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:symptoms.delete'])->group(fn () => Route::resource('symptoms', SymptomController::class)->only(['destroy']));

use App\Http\Controllers\Admin\SymptomMedicineMapController;
use App\Http\Controllers\Admin\VisitController;

Route::middleware(['auth', 'permission:visits.view'])->group(function () {
    Route::get('visits/suggestions', [VisitController::class, 'suggestions'])->name('visits.suggestions');
    Route::get('visits/{visit}/pdf', [VisitController::class, 'pdf'])->name('visits.pdf');
    Route::resource('visits', VisitController::class)->only(['index', 'show']);
});
Route::middleware(['auth', 'permission:visits.create'])->group(fn () => Route::resource('visits', VisitController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:visits.update'])->group(fn () => Route::resource('visits', VisitController::class)->only(['edit', 'update']));
Route::middleware(['auth', 'permission:visits.delete'])->group(fn () => Route::resource('visits', VisitController::class)->only(['destroy']));

Route::middleware(['auth', 'permission:symptom_medicine_map.view'])->group(function () {
    Route::post('symptom_medicine_map/import', [SymptomMedicineMapController::class, 'import'])->name('symptom_medicine_map.import');
    Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['index']);
});
Route::middleware(['auth', 'permission:symptom_medicine_map.create'])->group(fn () => Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['create', 'store']));
Route::middleware(['auth', 'permission:symptom_medicine_map.delete'])->group(fn () => Route::resource('symptom_medicine_map', SymptomMedicineMapController::class)->only(['destroy']));

use App\Http\Controllers\Admin\AdviceItemController;
use App\Http\Controllers\Admin\ClinicSettingController;
use App\Http\Controllers\Admin\DoctorController;
use App\Http\Controllers\Admin\FoodRestrictionController;

Route::middleware(['auth', 'permission:settings.view'])->group(function () {
    Route::get('settings', [ClinicSettingController::class, 'edit'])->name('settings.edit');
    Route::put('settings', [ClinicSettingController::class, 'update'])->name('settings.update');

    Route::resource('doctors', DoctorController::class)->except(['show']);
    Route::resource('advice_items', AdviceItemController::class)->except(['show']);
    Route::resource('food_restrictions', FoodRestrictionController::class)->except(['show']);
});

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\ReportController;

Route::middleware(['auth', 'permission:reports.view'])->group(function () {
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->name('activity_logs.index');
});

use App\Http\Controllers\Admin\AppointmentRequestController as AdminApptController;

Route::middleware(['auth', 'permission:appointments.view'])->group(function () {
    Route::get('/appointment-requests', [AdminApptController::class, 'index'])->name('appointment_requests.index');
});
Route::middleware(['auth', 'permission:appointments.update'])->group(function () {
    Route::put('/appointment-requests/{appointmentRequest}', [AdminApptController::class, 'update'])->name('appointment_requests.update');
    Route::post('/appointment-requests/{appointmentRequest}/convert', [AdminApptController::class, 'convertToPatient'])->name('appointment_requests.convert');
});
