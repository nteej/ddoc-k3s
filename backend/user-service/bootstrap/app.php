<?php

use App\Infrastructure\Http\Middlewares\ExtractJwtClaimsMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust X-Forwarded-For/Host/Proto from nginx+Kong but NOT X-Forwarded-Port
        // (Kong injects port 8000 which breaks URL generation for browser OAuth redirects)
        $middleware->trustProxies(
            at: '*',
            headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR
                   | \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST
                   | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO,
        );
        // Passport's OAuth routes use auth_token for CSRF; exclude from Laravel CSRF middleware
        $middleware->validateCsrfTokens(except: ['/oauth/*']);
        $middleware->prepend(HandleCors::class);
        $middleware->alias([
            'jwt.auth'     => ExtractJwtClaimsMiddleware::class,
            'rbac'         => \App\Infrastructure\Http\Middlewares\RbacMiddleware::class,
            'system_admin' => \App\Infrastructure\Http\Middlewares\SystemAdminMiddleware::class,
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->withCommands([
        __DIR__ . '/../app/Infrastructure/Kafka/Consumers',
    ])->create();
