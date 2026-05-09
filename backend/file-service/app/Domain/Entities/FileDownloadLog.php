<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use DateTimeImmutable;
use Illuminate\Support\Str;

final class FileDownloadLog
{
    public function __construct(
        public readonly string           $id,
        public readonly string           $fileId,
        public readonly string           $downloadedByUserId,
        public readonly ?string          $ipAddress,
        public readonly DateTimeImmutable $downloadedAt,
    ) {}

    public static function create(
        string  $fileId,
        string  $downloadedByUserId,
        ?string $ipAddress = null,
    ): self {
        return new self(
            id:                 Str::orderedUuid()->toString(),
            fileId:             $fileId,
            downloadedByUserId: $downloadedByUserId,
            ipAddress:          $ipAddress,
            downloadedAt:       new DateTimeImmutable(),
        );
    }
}
