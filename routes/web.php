<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\QueueController;
use App\Http\Controllers\AppointmentRequestController;
use App\Http\Controllers\ClinicBrandingController;
use App\Http\Controllers\DoctorPhotoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Public\DigitalPrescriptionController;
use App\Http\Controllers\Public\LanguageController;
use App\Http\Controllers\PublicController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PublicController::class, 'index'])->name('home');
Route::get('/about', [PublicController::class, 'about'])->name('about');
Route::get('/doctors', [PublicController::class, 'doctors'])->name('doctors');
Route::get('/clinic-logo', [ClinicBrandingController::class, 'logo'])->name('clinic.logo');
Route::get('/clinic-favicon', [ClinicBrandingController::class, 'favicon'])->name('clinic.favicon');
Route::get('/doctor-profiles/{doctor}/photo', [DoctorPhotoController::class, 'showPublic'])->name('doctors.photo');
Route::get('/doctor-profiles/{doctor}/signature', [ClinicBrandingController::class, 'doctorSignature'])->name('doctors.signature');
Route::get('/doctor-profiles/{doctor}/seal', [ClinicBrandingController::class, 'doctorSeal'])->name('doctors.seal');
Route::get('/contact', [PublicController::class, 'contact'])->name('contact');
Route::get('/appointment-request', [PublicController::class, 'appointmentRequest'])
    ->name('appointment.request.form');
Route::post('/appointment-requests', [AppointmentRequestController::class, 'store'])
    ->name('appointment.store')
    ->middleware('throttle:5,1');
Route::post('/language', [LanguageController::class, 'switch'])->name('language.switch');

// Public Waiting Room TV Queue Display (for TV screens / kiosks in waiting room)
Route::get('/queue/display', [QueueController::class, 'display'])->name('queue.display');
Route::get('/queue/live-state', [QueueController::class, 'liveData'])->name('queue.live_state');

// Public Digital Prescription Sharing (WhatsApp / SMS link)
Route::get('/rx/{token}', [DigitalPrescriptionController::class, 'show'])->name('rx.show');
Route::get('/rx/{token}/pdf', [DigitalPrescriptionController::class, 'downloadPdf'])->name('rx.pdf');

// Public Digital Prescription Sharing (WhatsApp / SMS link)
Route::get('/rx/{token}', [DigitalPrescriptionController::class, 'show'])->name('rx.show');
Route::get('/rx/{token}/pdf', [DigitalPrescriptionController::class, 'downloadPdf'])->name('rx.pdf');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    // DELETE /profile intentionally removed — staff accounts are deactivated by Super Admin only.
});

require __DIR__.'/auth.php';

Route::get('/admin', function () {
    return redirect()->route('admin.dashboard');
});

Route::prefix('admin')->name('admin.')->group(function () {
    require __DIR__.'/admin.php';
});
