<?php

use App\Infrastructure\Http\Controllers\AuthWebController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('welcome'));

// Web session login required by Passport's /oauth/authorize flow.
// Users land here when they hit /oauth/authorize without an active web session.
Route::get('/login',  [AuthWebController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthWebController::class, 'login']);