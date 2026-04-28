<?php

namespace App\Infrastructure\Providers;

use App\Application\Events\UserLoggedIn;
use App\Application\Listeners\PublishUserLoginToKafka;
use App\Domain\Exceptions\ExceptionHandler;
use App\Domain\Repositories\UserRepositoryInterface;
use App\Infrastructure\Repositories\ApiKeyRepository;
use App\Infrastructure\Repositories\NotificationRepository;
use App\Infrastructure\Repositories\OrganizationRepository;
use App\Infrastructure\Repositories\UserRepository;
use App\Infrastructure\Repositories\WebhookRepository;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

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

        Event::listen(
            UserLoggedIn::class,
            PublishUserLoginToKafka::class,
        );
    }
}
