<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use Illuminate\Support\Str;
use InvalidArgumentException;

final class Webhook
{
    public const ALLOWED_EVENTS = [
        'document.generated',
        'document.failed',
        'member.invited',
        'member.joined',
    ];

    private function __construct(
        public readonly string $id,
        public readonly string $organizationId,
        public readonly string $url,
        public readonly string $secret,
        public readonly array  $events,
        public readonly bool   $active,
    ) {
        if (!Str::isUuid($id))             throw new InvalidArgumentException("Invalid webhook id: $id");
        if (!Str::isUuid($organizationId)) throw new InvalidArgumentException("Invalid organizationId: $organizationId");
        if (!filter_var($url, FILTER_VALIDATE_URL)) throw new InvalidArgumentException("Invalid webhook URL: $url");

        $invalid = array_diff($events, self::ALLOWED_EVENTS);
        if (!empty($invalid)) {
            throw new InvalidArgumentException('Unknown events: ' . implode(', ', $invalid));
        }
    }

    public static function create(string $organizationId, string $url, array $events): self
    {
        return new self(
            id:             (string) Str::orderedUuid(),
            organizationId: $organizationId,
            url:            $url,
            secret:         bin2hex(random_bytes(16)), // 32-char hex signing secret
            events:         $events,
            active:         true,
        );
    }

    public static function restore(
        string $id,
        string $organizationId,
        string $url,
        string $secret,
        array  $events,
        bool   $active,
    ): self {
        return new self($id, $organizationId, $url, $secret, $events, $active);
    }
}
