<?php

use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\DataController;
use App\Http\Controllers\ManagementClassController;
use App\Http\Controllers\MasterDataController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\StudentEnrollmentController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/absensi', [AbsensiController::class, 'index'])->name('absensi');
Route::get('/data', [DataController::class, 'index'])->name('data');
Route::get('/data/export', [DataController::class, 'export'])->name('data.export');

Route::middleware('auth')->group(function () {
    // Manajemen Jadwal Lab — terhubung ke database (issue #3).
    Route::get('/management-schedule', [ManagementClassController::class, 'index'])
        ->name('management-schedule');
    Route::post('/management-schedule', [ManagementClassController::class, 'store'])
        ->name('management-schedule.store');
    Route::put('/management-schedule/{schedule}', [ManagementClassController::class, 'update'])
        ->name('management-schedule.update');
    Route::delete('/management-schedule/{schedule}', [ManagementClassController::class, 'destroy'])
        ->name('management-schedule.destroy');
});

Route::middleware('auth')->group(function () {
    // Master Data — CRUD Guru / Kelas / Ruangan / Mapel (issue #5).
    Route::get('/master-data', [MasterDataController::class, 'index'])->name('master-data');
    Route::get('/master-data/{entity}', [MasterDataController::class, 'index'])->name('master-data.entity');
    Route::post('/master-data/{entity}', [MasterDataController::class, 'store'])->name('master-data.store');
    Route::put('/master-data/{entity}/{id}', [MasterDataController::class, 'update'])->name('master-data.update');
    Route::delete('/master-data/{entity}/{id}', [MasterDataController::class, 'destroy'])->name('master-data.destroy');
});

Route::middleware('auth')->group(function () {
    // Enrollment History — riwayat penempatan kelas siswa per tahun ajaran.
    Route::get('/student-enrollments', [StudentEnrollmentController::class, 'index'])
        ->name('student-enrollments');
    Route::post('/student-enrollments', [StudentEnrollmentController::class, 'store'])
        ->name('student-enrollments.store');
    Route::put('/student-enrollments/{enrollment}', [StudentEnrollmentController::class, 'update'])
        ->name('student-enrollments.update');
    Route::delete('/student-enrollments/{enrollment}', [StudentEnrollmentController::class, 'destroy'])
        ->name('student-enrollments.destroy');
});

Route::get('/dashboard', function () {
    // Lab app has no generic dashboard; land logged-in users straight in the lab schedule manager.
    return redirect()->route('management-schedule');
})->middleware('auth')->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
