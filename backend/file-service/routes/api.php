<?php

use App\Infrastructure\Http\Controllers\FileController;
use App\Infrastructure\Http\Middlewares\AuditMiddleware;
use App\Infrastructure\Http\Middlewares\ExtractJwtClaimsMiddleware;
use Illuminate\Support\Facades\Route;

Route::middleware([ExtractJwtClaimsMiddleware::class, AuditMiddleware::class])->group(function () {
    Route::prefix('files')->controller(FileController::class)->group(function () {
        Route::get('/filters', 'findByFilters');
        Route::post('/async-generate', 'asyncGenerate');
        Route::delete('/{fileId}', 'destroy');
        Route::get('/download/{fileId}', 'download');
    });
});