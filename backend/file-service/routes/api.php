<?php

use App\Infrastructure\Http\Controllers\FileController;
use App\Infrastructure\Http\Middlewares\AuditMiddleware;
use Illuminate\Support\Facades\Route;

// Viewer+: list, download, email, history, and delete (handler enforces ownership vs admin)
Route::middleware(['jwt.auth', 'rbac:viewer', AuditMiddleware::class])->group(function () {
    Route::get('/files/filters',                   [FileController::class, 'findByFilters']);
    Route::get('/files/download/{fileId}',          [FileController::class, 'download']);
    Route::post('/files/{fileId}/send-email',       [FileController::class, 'sendEmail']);
    Route::get('/files/{fileId}/email-history',     [FileController::class, 'emailHistory']);
    Route::get('/files/{fileId}/download-history',  [FileController::class, 'downloadHistory']);
    Route::delete('/files/{fileId}',                [FileController::class, 'destroy']);
});

// Editor+: generate documents (plan quota enforced)
Route::middleware(['jwt.auth', 'rbac:editor', 'plan.limit', AuditMiddleware::class])->group(function () {
    Route::post('/files/async-generate', [FileController::class, 'asyncGenerate']);
});
