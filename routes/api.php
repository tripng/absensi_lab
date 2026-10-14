<?php

use App\Http\Controllers\Api\LogAksesController;
use Illuminate\Support\Facades\Route;

// Route API untuk aplikasi scan eksternal.
// Middleware 'api' memastikan response error berupa JSON bukan redirect.
Route::middleware('api')->group(function () {
    Route::get('/log-akses/health', [LogAksesController::class, 'health']);

    // API token required — kirim Bearer token di Authorization header.
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/log-akses/batch', [LogAksesController::class, 'storeBatch']);
    });
});
