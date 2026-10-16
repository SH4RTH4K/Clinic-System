<?php

use App\Http\Controllers\AppointmentRequestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Public\LanguageController;
use App\Http\Controllers\PublicController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PublicController::class, 'index'])->name('home');
Route::get('/about', [PublicController::class, 'about'])->name('about');
Route::get('/doctors', [PublicController::class, 'doctors'])->name('doctors');
Route::get('/contact', [PublicController::class, 'contact'])->name('contact');
Route::post('/appointment-requests', [AppointmentRequestController::class, 'store'])
    ->name('appointment.store')
    ->middleware('throttle:5,1');
Route::post('/language', [LanguageController::class, 'switch'])->name('language.switch');

use App\Http\Controllers\Admin\DashboardController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    // DELETE /profile intentionally removed — staff accounts are deactivated by Super Admin only.
});

require __DIR__.'/auth.php';

Route::prefix('admin')->name('admin.')->group(function () {
    require __DIR__.'/admin.php';
});
