<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middlewares;

use App\Infrastructure\Kafka\Producers\KafkaProducer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditMiddleware
{
    public function __construct(private KafkaProducer $producer) {}

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            $user = $request->attributes->get('loggedUser');
            if ($user) {
                $this->producer->send(
                    topic: 'audit.events',
                    payload: [
                        'userId'     => $user['userId'] ?? null,
                        'userName'   => $user['name'] ?? null,
                        'action'     => $request->method() . ' ' . $request->path(),
                        'service'    => env('DD_SERVICE', 'template-service'),
                        'statusCode' => $response->getStatusCode(),
                        'timestamp'  => now()->toIso8601String(),
                    ]
                );
            }
        } catch (\Throwable) {
            // audit failures must never block responses
        }

        return $response;
    }
}
