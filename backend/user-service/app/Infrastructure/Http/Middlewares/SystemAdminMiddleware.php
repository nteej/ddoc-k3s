<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middlewares;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SystemAdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $claims = $request->attributes->get('loggedUser');

        if (empty($claims['isSystemAdmin'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
