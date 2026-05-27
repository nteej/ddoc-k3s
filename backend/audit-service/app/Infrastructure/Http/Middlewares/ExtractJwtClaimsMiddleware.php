<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middlewares;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
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

        // Custom JWT — fast path (Kong already verified signature)
        if (($payload['iss'] ?? null) === 'user-service') {
            $request->attributes->set('loggedUser', $payload);
            return $next($request);
        }

        // Passport Bearer token — validate via introspection
        if ($request->bearerToken() === $token) {
            $claims = $this->introspect($token);
            if (!$claims || !($claims['active'] ?? false)) {
                return response()->json(['error' => 'Invalid or revoked token'], 401);
            }
            $request->attributes->set('loggedUser', $claims);
            return $next($request);
        }

        return response()->json(['error' => 'Unknown token format'], 401);
    }

    private function introspect(string $token): ?array
    {
        $url    = rtrim((string) env('USER_SERVICE_URL', ''), '/') . '/api/oauth/introspect';
        $secret = (string) env('INTROSPECT_SECRET', '');

        $response = Http::withHeaders([
            'Authorization'       => 'Bearer ' . $token,
            'X-Introspect-Secret' => $secret,
        ])->post($url);

        return $response->ok() ? $response->json() : null;
    }
}
