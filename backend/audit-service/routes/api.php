<?php

use App\Infrastructure\Http\Controllers\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::middleware(['jwt.auth', 'rbac:admin'])->group(function () {
    Route::prefix('audit-logs')->controller(AuditLogController::class)->group(function () {
        Route::get('/', 'index');
    });
});
