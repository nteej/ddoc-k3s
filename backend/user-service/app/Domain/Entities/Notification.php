<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use Illuminate\Support\Str;

final class Notification
{
    private function __construct(
        public readonly string  $id,
        public readonly string  $userId,
        public readonly ?string $organizationId,
        public readonly string  $type,
        public readonly string  $title,
        public readonly string  $body,
        public readonly ?array  $data,
        public readonly ?string $readAt,
        public readonly string  $createdAt,
    ) {}

    public static function create(
        string  $userId,
        string  $type,
        string  $title,
        string  $body,
        ?array  $data = null,
        ?string $organizationId = null,
    ): self {
        return new self(
            id:             (string) Str::orderedUuid(),
            userId:         $userId,
            organizationId: $organizationId,
            type:           $type,
            title:          $title,
            body:           $body,
            data:           $data,
            readAt:         null,
            createdAt:      now()->toIso8601String(),
        );
    }

    public static function restore(
        string  $id,
        string  $userId,
        ?string $organizationId,
        string  $type,
        string  $title,
        string  $body,
        ?array  $data,
        ?string $readAt,
        string  $createdAt,
    ): self {
        return new self($id, $userId, $organizationId, $type, $title, $body, $data, $readAt, $createdAt);
    }
}
