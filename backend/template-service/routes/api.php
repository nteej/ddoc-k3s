<?php

use App\Infrastructure\Http\Controllers\ContextController;
use App\Infrastructure\Http\Controllers\SectionController;
use App\Infrastructure\Http\Controllers\TagController;
use App\Infrastructure\Http\Controllers\TemplateController;
use App\Infrastructure\Http\Middlewares\AuditMiddleware;
use Illuminate\Support\Facades\Route;

// Viewer+: read-only (all authenticated roles)
Route::middleware(['jwt.auth', 'rbac:viewer', AuditMiddleware::class])->group(function () {
    Route::get('/contexts/filters',  [ContextController::class,  'findByFilters']);
    Route::get('/tags/filters',      [TagController::class,      'findByFilters']);
    Route::get('/templates/filters', [TemplateController::class, 'findByFilters']);
    Route::get('/sections/filters',  [SectionController::class,  'findByFilters']);
});

// Editor+: create & edit
Route::middleware(['jwt.auth', 'rbac:editor', AuditMiddleware::class])->group(function () {
    Route::post('/contexts',       [ContextController::class,  'store']);
    Route::patch('/contexts/{id}', [ContextController::class,  'update']);

    Route::post('/tags',       [TagController::class, 'store']);
    Route::patch('/tags/{id}', [TagController::class, 'update']);

    Route::post('/templates',       [TemplateController::class, 'store']);
    Route::patch('/templates/{id}', [TemplateController::class, 'update']);

    Route::post('/sections',       [SectionController::class, 'store']);
    Route::patch('/sections/{id}', [SectionController::class, 'update']);
});

// Admin+: delete
Route::middleware(['jwt.auth', 'rbac:admin', AuditMiddleware::class])->group(function () {
    Route::delete('/contexts/{id}',  [ContextController::class,  'destroy']);
    Route::delete('/tags/{id}',      [TagController::class,      'destroy']);
    Route::delete('/templates/{id}', [TemplateController::class, 'destroy']);
    Route::delete('/sections/{id}',  [SectionController::class,  'destroy']);
});
