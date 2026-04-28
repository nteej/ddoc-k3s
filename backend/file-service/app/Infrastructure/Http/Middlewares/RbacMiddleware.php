<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middlewares;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RbacMiddleware
{
    private const HIERARCHY = ['viewer' => 1, 'editor' => 2, 'admin' => 3, 'owner' => 4];

    public function handle(Request $request, Closure $next, string $minRole = 'viewer'): Response
    {
        $claims = $request->attributes->get('loggedUser');
        $role   = $claims['role'] ?? 'viewer';

        $userLevel = self::HIERARCHY[$role]    ?? 0;
        $minLevel  = self::HIERARCHY[$minRole] ?? 1;

        if ($userLevel < $minLevel) {
            return response()->json(['error' => 'Insufficient permissions'], 403);
        }

        return $next($request);
    }
}
