<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\ApiKey;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ApiKeyRepository
{
    public function insert(ApiKey $key): void
    {
        DB::table('api_keys')->insert([
            'id'              => $key->id,
            'organization_id' => $key->organizationId,
            'name'            => $key->name,
            'key_hash'        => $key->keyHash,
            'role'            => $key->role,
            'last_used_at'    => $key->lastUsedAt,
            'expires_at'      => $key->expiresAt,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }

    public function findByHash(string $hash): ?ApiKey
    {
        $row = DB::table('api_keys')->where('key_hash', $hash)->first();
        return $row ? $this->map($row) : null;
    }

    public function listForOrg(string $organizationId): Collection
    {
        return DB::table('api_keys')
            ->where('organization_id', $organizationId)
            ->orderBy('created_at')
            ->get()
            ->map(fn($r) => $this->map($r));
    }

    public function countForOrg(string $organizationId): int
    {
        return (int) DB::table('api_keys')->where('organization_id', $organizationId)->count();
    }

    public function delete(string $id, string $organizationId): bool
    {
        return (bool) DB::table('api_keys')
            ->where('id', $id)
            ->where('organization_id', $organizationId)
            ->delete();
    }

    public function touchLastUsed(string $id): void
    {
        DB::table('api_keys')->where('id', $id)->update(['last_used_at' => now()]);
    }

    private function map(object $row): ApiKey
    {
        return ApiKey::restore(
            id:             $row->id,
            organizationId: $row->organization_id,
            name:           $row->name,
            keyHash:        $row->key_hash,
            role:           $row->role,
            lastUsedAt:     $row->last_used_at,
            expiresAt:      $row->expires_at,
        );
    }
}
