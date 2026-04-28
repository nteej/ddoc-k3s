<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use Illuminate\Support\Str;
use InvalidArgumentException;

final class Organization
{
    private function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly string $slug,
        public readonly string $plan,
        public readonly string $ownerId,
        public readonly int    $maxMembers,
    ) {
        if (!Str::isUuid($id))       throw new InvalidArgumentException("Invalid organization id: $id");
        if (trim($name) === '')      throw new InvalidArgumentException('Organization name cannot be empty');
        if (trim($slug) === '')      throw new InvalidArgumentException('Organization slug cannot be empty');
    }

    public static function create(string $name, string $ownerId, string $plan = 'free', int $maxMembers = 5): self
    {
        return new self(
            id:         (string) Str::orderedUuid(),
            name:       $name,
            slug:       self::slugify($name),
            plan:       $plan,
            ownerId:    $ownerId,
            maxMembers: $maxMembers,
        );
    }

    public static function restore(
        string $id,
        string $name,
        string $slug,
        string $plan,
        string $ownerId,
        int    $maxMembers,
    ): self {
        return new self($id, $name, $slug, $plan, $ownerId, $maxMembers);
    }

    private static function slugify(string $name): string
    {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));
        return $slug ?: 'org';
    }
}
