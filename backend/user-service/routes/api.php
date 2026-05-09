<?php

use App\Infrastructure\Http\Controllers\ApiKeyController;
use App\Infrastructure\Http\Controllers\AuthController;
use App\Infrastructure\Http\Controllers\HealthController;
use App\Infrastructure\Http\Controllers\NotificationController;
use App\Infrastructure\Http\Controllers\OrganizationController;
use App\Infrastructure\Http\Controllers\PackageController;
use App\Infrastructure\Http\Controllers\PackageUpgradeController;
use App\Infrastructure\Http\Controllers\SsoController;
use App\Infrastructure\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/health/system', [HealthController::class, 'system']);

Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::post('/login', 'login');
    Route::post('/register', 'register');
    Route::post('/logout', 'logout');
    Route::post('/forgot-password', 'forgotPassword');
    Route::post('/reset-password', 'resetPassword');
    Route::get('/me', 'me')->middleware('jwt.auth');
});

// SSO — public routes
Route::prefix('auth/sso')->controller(SsoController::class)->group(function () {
    Route::get('/{provider}', 'redirect');
    Route::get('/{provider}/callback', 'callback');
});

// Invitations — token lookup is public, accept requires an existing account
Route::get('/invitations/{token}', [OrganizationController::class, 'showInvitation']);
Route::post('/invitations/{token}/accept', [OrganizationController::class, 'acceptInvitation']);

// API Keys — admin+
Route::middleware(['jwt.auth', 'rbac:admin'])->group(function () {
    Route::get('/api-keys',         [ApiKeyController::class, 'index']);
    Route::post('/api-keys',        [ApiKeyController::class, 'store']);
    Route::delete('/api-keys/{id}', [ApiKeyController::class, 'destroy']);
});

// Webhooks — admin+
Route::middleware(['jwt.auth', 'rbac:admin'])->group(function () {
    Route::get('/webhooks',                     [WebhookController::class, 'index']);
    Route::post('/webhooks',                    [WebhookController::class, 'store']);
    Route::delete('/webhooks/{id}',             [WebhookController::class, 'destroy']);
    Route::get('/webhooks/{id}/deliveries',     [WebhookController::class, 'deliveries']);
});

// Notifications
Route::middleware('jwt.auth')->group(function () {
    Route::get('/notifications',              [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read',  [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all',    [NotificationController::class, 'markAllRead']);
});

// Organization management — read + switch available to all members
Route::middleware('jwt.auth')->group(function () {
    Route::get('/organizations/current',         [OrganizationController::class, 'show']);
    Route::get('/organizations/current/members', [OrganizationController::class, 'listMembers']);
    Route::post('/organizations/switch/{orgId}', [OrganizationController::class, 'switchOrganization']);
});

// Organization configuration — admin+
Route::middleware(['jwt.auth', 'rbac:admin'])->group(function () {
    Route::patch('/organizations/current',                   [OrganizationController::class, 'update']);
    Route::post('/organizations/current/invitations',        [OrganizationController::class, 'invite']);
    Route::patch('/organizations/current/members/{userId}',  [OrganizationController::class, 'updateMemberRole']);
    Route::delete('/organizations/current/members/{userId}', [OrganizationController::class, 'removeMember']);
});

// Packages — public list + current package + upgrade request (all authenticated users)
Route::middleware('jwt.auth')->group(function () {
    Route::get('/packages',                               [PackageUpgradeController::class, 'publicIndex']);
    Route::get('/organizations/current/package',          [PackageUpgradeController::class, 'currentPackage']);
    Route::post('/organizations/current/upgrade-request', [PackageUpgradeController::class, 'requestUpgrade']);
});

// Admin package management and upgrade approvals
Route::middleware(['jwt.auth', 'rbac:admin'])->group(function () {
    Route::get('/admin/packages',                [PackageController::class, 'index']);
    Route::post('/admin/packages',               [PackageController::class, 'store']);
    Route::patch('/admin/packages/{id}',         [PackageController::class, 'update']);
    Route::delete('/admin/packages/{id}',        [PackageController::class, 'destroy']);
    Route::get('/admin/upgrade-requests',        [PackageUpgradeController::class, 'adminIndex']);
    Route::patch('/admin/upgrade-requests/{id}', [PackageUpgradeController::class, 'adminAction']);
});
