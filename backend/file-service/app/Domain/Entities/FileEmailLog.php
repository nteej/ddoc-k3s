<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use DateTimeImmutable;
use Illuminate\Support\Str;

final class FileEmailLog
{
    public function __construct(
        public readonly string           $id,
        public readonly string           $fileId,
        public readonly string           $sentByUserId,
        public readonly string           $recipientEmail,
        public readonly ?string          $message,
        public readonly string           $status,
        public readonly ?string          $errorMessage,
        public readonly DateTimeImmutable $sentAt,
    ) {}

    public static function create(
        string  $fileId,
        string  $sentByUserId,
        string  $recipientEmail,
        ?string $message = null,
        string  $status = 'sent',
        ?string $errorMessage = null,
    ): self {
        return new self(
            id:             Str::orderedUuid()->toString(),
            fileId:         $fileId,
            sentByUserId:   $sentByUserId,
            recipientEmail: $recipientEmail,
            message:        $message,
            status:         $status,
            errorMessage:   $errorMessage,
            sentAt:         new DateTimeImmutable(),
        );
    }
}
