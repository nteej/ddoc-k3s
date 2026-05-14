<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use Illuminate\Support\Str;

final class KlarnaSetting
{
    public function __construct(
        public readonly string  $id,
        public readonly string  $mode,
        public readonly ?string $sandboxUsername,
        public readonly ?string $sandboxPassword,
        public readonly ?string $productionUsername,
        public readonly ?string $productionPassword,
    ) {}

    public static function create(
        string  $mode = 'sandbox',
        ?string $sandboxUsername = null,
        ?string $sandboxPassword = null,
        ?string $productionUsername = null,
        ?string $productionPassword = null,
    ): self {
        return new self(
            id:                 Str::orderedUuid()->toString(),
            mode:               $mode,
            sandboxUsername:    $sandboxUsername,
            sandboxPassword:    $sandboxPassword,
            productionUsername: $productionUsername,
            productionPassword: $productionPassword,
        );
    }
}
