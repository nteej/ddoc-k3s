<?php

declare(strict_types=1);

namespace App\Infrastructure\Providers;

use App\Infrastructure\Repositories\AuditLogRepository;
use App\Infrastructure\Repositories\AuditLogRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $this->app->bind(AuditLogRepositoryInterface::class, AuditLogRepository::class);
    }
}
