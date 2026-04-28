<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use Illuminate\Support\Str;
use InvalidArgumentException;

final class OrganizationMember
{
    public const ROLES = ['viewer', 'editor', 'admin', 'owner'];

    private function __construct(
        public readonly string $id,
        public readonly string $organizationId,
        public readonly string $userId,
        public readonly string $role,
    ) {
        if (!Str::isUuid($id))             throw new InvalidArgumentException("Invalid member id: $id");
        if (!Str::isUuid($organizationId)) throw new InvalidArgumentException("Invalid organizationId: $organizationId");
        if (!Str::isUuid($userId))         throw new InvalidArgumentException("Invalid userId: $userId");
        if (!in_array($role, self::ROLES, true)) {
            throw new InvalidArgumentException("Invalid role: $role. Must be one of: " . implode(', ', self::ROLES));
        }
    }

    public static function create(string $organizationId, string $userId, string $role): self
    {
        return new self(
            id:             (string) Str::orderedUuid(),
            organizationId: $organizationId,
            userId:         $userId,
            role:           $role,
        );
    }

    public static function restore(
        string $id,
        string $organizationId,
        string $userId,
        string $role,
    ): self {
        return new self($id, $organizationId, $userId, $role);
    }
}
