<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Domain\Entities\ApiKey;
use App\Domain\Entities\OrganizationMember;
use App\Infrastructure\Kafka\Producers\KafkaProducer;
use App\Infrastructure\Repositories\ApiKeyRepository;
use App\Infrastructure\Repositories\OrganizationRepository;
use App\Infrastructure\Repositories\PackageRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ApiKeyController extends BaseController
{
    public function __construct(
        private readonly ApiKeyRepository       $keyRepo,
        private readonly OrganizationRepository $orgRepo,
        private readonly KafkaProducer          $kafka,
        private readonly PackageRepository      $packageRepo,
    ) {}

    // GET /api-keys
    public function index(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $keys   = $this->keyRepo->listForOrg($claims['organizationId']);

        return $this->successResponse($keys->map(fn(ApiKey $k) => [
            'id'           => $k->id,
            'name'         => $k->name,
            'role'         => $k->role,
            'last_used_at' => $k->lastUsedAt,
            'expires_at'   => $k->expiresAt,
        ]));
    }

    // POST /api-keys
    public function store(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $data   = $request->validate([
            'name'       => 'required|string|max:100',
            'role'       => ['sometimes', Rule::in(OrganizationMember::ROLES)],
            'expires_at' => 'sometimes|nullable|date|after:now',
        ]);

        $org   = $this->orgRepo->findById($claims['organizationId']);
        $pkg   = $org?->packageId
            ? $this->packageRepo->findById($org->packageId)
            : $this->packageRepo->findBySlug($org?->plan ?? 'free');
        $limit = ($pkg && $pkg->maxApiKeys !== -1) ? $pkg->maxApiKeys : ($pkg ? PHP_INT_MAX : 1);
        $count = $this->keyRepo->countForOrg($claims['organizationId']);

        if ($count >= $limit) {
            return response()->json(['message' => "API key limit ({$limit}) reached for your plan"], 422);
        }

        ['entity' => $entity, 'plain' => $plain] = ApiKey::generate(
            organizationId: $claims['organizationId'],
            name:           $data['name'],
            role:           $data['role'] ?? 'editor',
            expiresAt:      $data['expires_at'] ?? null,
        );

        $this->keyRepo->insert($entity);

        $this->publishNotification($claims['organizationId'], [
            'type'           => 'api_key.created',
            'organizationId' => $claims['organizationId'],
            'title'          => 'New API key created',
            'body'           => "API key \"{$entity->name}\" ({$entity->role}) was created.",
            'data'           => ['keyId' => $entity->id, 'name' => $entity->name],
        ]);

        return $this->successResponse([
            'id'   => $entity->id,
            'name' => $entity->name,
            'role' => $entity->role,
            'key'  => $plain, // shown ONCE
        ], 201);
    }

    // DELETE /api-keys/{id}
    public function destroy(Request $request, string $id): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $deleted = $this->keyRepo->delete($id, $claims['organizationId']);

        if (!$deleted) {
            return response()->json(['message' => 'API key not found'], 404);
        }

        $this->publishNotification($claims['organizationId'], [
            'type'           => 'api_key.revoked',
            'organizationId' => $claims['organizationId'],
            'title'          => 'API key revoked',
            'body'           => 'An API key was revoked from your organisation.',
            'data'           => ['keyId' => $id],
        ]);

        return $this->successResponse(['message' => 'API key revoked']);
    }

    private function publishNotification(string $orgId, array $payload): void
    {
        try {
            $this->kafka->send('notification.dispatch', $payload);
        } catch (\Throwable) {}
    }
}
