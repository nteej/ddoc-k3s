<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middlewares;

use App\Infrastructure\Repositories\ApiKeyRepository;
use App\Infrastructure\Repositories\OrganizationRepository;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyMiddleware
{
    public function __construct(
        private readonly ApiKeyRepository      $keyRepo,
        private readonly OrganizationRepository $orgRepo,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $bearer = $request->bearerToken();

        if (!$bearer || !str_starts_with($bearer, 'ddk_')) {
            return response()->json(['error' => 'Missing or invalid API key'], 401);
        }

        $hash   = hash('sha256', $bearer);
        $apiKey = $this->keyRepo->findByHash($hash);

        if (!$apiKey) {
            return response()->json(['error' => 'Invalid API key'], 401);
        }

        if ($apiKey->expiresAt && now()->isAfter($apiKey->expiresAt)) {
            return response()->json(['error' => 'API key has expired'], 401);
        }

        $org = $this->orgRepo->findById($apiKey->organizationId);

        // Synthesise the same claims shape jwt.auth produces
        $request->attributes->set('loggedUser', [
            'userId'           => 'api-key:' . $apiKey->id,
            'name'             => 'API Key: ' . $apiKey->name,
            'email'            => null,
            'organizationId'   => $apiKey->organizationId,
            'organizationSlug' => $org?->slug,
            'role'             => $apiKey->role,
        ]);

        // Fire-and-forget — don't block the request
        try {
            $this->keyRepo->touchLastUsed($apiKey->id);
        } catch (\Throwable) {}

        return $next($request);
    }
}
