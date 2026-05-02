<?php

use App\Infrastructure\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::post('/notifications/send', [NotificationController::class, 'send']);
