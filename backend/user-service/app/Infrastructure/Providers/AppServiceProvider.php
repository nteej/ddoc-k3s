<?php

namespace App\Infrastructure\Providers;

use App\Application\Events\UserLoggedIn;
use App\Application\Listeners\PublishUserLoginToKafka;
use App\Domain\Exceptions\ExceptionHandler;
use App\Domain\Repositories\UserRepositoryInterface;
use App\Infrastructure\Repositories\ApiKeyRepository;
use App\Infrastructure\Repositories\NotificationRepository;
use App\Infrastructure\Repositories\OrganizationRepository;
use App\Infrastructure\Repositories\PackageRepository;
use App\Infrastructure\Repositories\PackageUpgradeRequestRepository;
use App\Infrastructure\Repositories\UserRepository;
use App\Infrastructure\Repositories\WebhookRepository;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton( \Illuminate\Contracts\Debug\ExceptionHandler::class, ExceptionHandler::class );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->singleton(OrganizationRepository::class);
        $this->app->singleton(ApiKeyRepository::class);
        $this->app->singleton(WebhookRepository::class);
        $this->app->singleton(NotificationRepository::class);
        $this->app->singleton(PackageRepository::class);
        $this->app->singleton(PackageUpgradeRequestRepository::class);

        Event::listen(
            UserLoggedIn::class,
            PublishUserLoginToKafka::class,
        );

        // Passport OAuth2 server configuration
        // useUuidIds() removed in Passport 12 — UUID support is automatic via HasUuids on the User model
        Passport::tokensExpireIn(now()->addHours(24));
        Passport::refreshTokensExpireIn(now()->addDays(30));
        Passport::personalAccessTokensExpireIn(now()->addMonths(6));
    }
}
