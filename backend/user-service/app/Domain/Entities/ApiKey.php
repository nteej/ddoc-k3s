<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use Illuminate\Support\Str;
use InvalidArgumentException;

final class ApiKey
{
    private function __construct(
        public readonly string  $id,
        public readonly string  $organizationId,
        public readonly string  $name,
        public readonly string  $keyHash,
        public readonly string  $role,
        public readonly ?string $lastUsedAt,
        public readonly ?string $expiresAt,
    ) {
        if (!Str::isUuid($id))             throw new InvalidArgumentException("Invalid api_key id: $id");
        if (!Str::isUuid($organizationId)) throw new InvalidArgumentException("Invalid organizationId: $organizationId");
        if (trim($name) === '')            throw new InvalidArgumentException('API key name cannot be empty');
    }

    /**
     * Creates a new API key and returns both the entity (for persistence) and the
     * plain-text key (shown once, never stored).
     *
     * @return array{entity: self, plain: string}
     */
    public static function generate(string $organizationId, string $name, string $role = 'editor', ?string $expiresAt = null): array
    {
        $plain = 'ddk_' . bin2hex(random_bytes(24)); // 52-char prefixed key
        $hash  = hash('sha256', $plain);

        $entity = new self(
            id:             (string) Str::orderedUuid(),
            organizationId: $organizationId,
            name:           $name,
            keyHash:        $hash,
            role:           $role,
            lastUsedAt:     null,
            expiresAt:      $expiresAt,
        );

        return ['entity' => $entity, 'plain' => $plain];
    }

    public static function restore(
        string  $id,
        string  $organizationId,
        string  $name,
        string  $keyHash,
        string  $role,
        ?string $lastUsedAt,
        ?string $expiresAt,
    ): self {
        return new self($id, $organizationId, $name, $keyHash, $role, $lastUsedAt, $expiresAt);
    }
}
