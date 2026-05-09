<?php

namespace App\Infrastructure\Providers;

use App\Application\Events\TemplateRequestedEvent;
use App\Application\Listeners\TemplateRequestedListener;
use App\Domain\Exceptions\ExceptionHandler;
use App\Domain\Repositories\FileDownloadLogRepositoryInterface;
use App\Domain\Repositories\FileEmailLogRepositoryInterface;
use App\Domain\Repositories\FileRepositoryInterface;
use App\Infrastructure\Helpers\LoggedUserHelper;
use App\Infrastructure\Repositories\FileDownloadLogRepository;
use App\Infrastructure\Repositories\FileEmailLogRepository;
use App\Infrastructure\Repositories\FileRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Knp\Snappy\Pdf;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton( \Illuminate\Contracts\Debug\ExceptionHandler::class, ExceptionHandler::class );
        
        $this->app->singleton(Pdf::class, function () {
            return new Pdf('/usr/local/bin/wkhtmltopdf');
        });
        
        $this->app->singleton(LoggedUserHelper::class, function ($app) {
            return new LoggedUserHelper($app->make(Request::class));
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->app->bind(FileRepositoryInterface::class, FileRepository::class);
        $this->app->bind(FileEmailLogRepositoryInterface::class, FileEmailLogRepository::class);
        $this->app->bind(FileDownloadLogRepositoryInterface::class, FileDownloadLogRepository::class);

        Event::listen(
            TemplateRequestedEvent::class,
            TemplateRequestedListener::class,
        );
    }
}
