<?php

use App\Infrastructure\Http\Controllers\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::prefix('audit-logs')->controller(AuditLogController::class)->group(function () {
    Route::get('/', 'index');
});
