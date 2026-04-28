<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middlewares;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExtractJwtClaimsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookie('token') ?? $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Missing token'], 401);
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return response()->json(['error' => 'Malformed token'], 401);
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

        if (!is_array($payload)) {
            return response()->json(['error' => 'Malformed token'], 401);
        }

        $request->attributes->set('loggedUser', $payload);

        return $next($request);
    }
}
