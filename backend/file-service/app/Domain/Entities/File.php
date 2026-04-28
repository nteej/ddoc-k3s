<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use App\Application\DTOs\BaseDTO;
use App\Domain\Enums\FileStatusEnum;
use DateTimeImmutable;
use Illuminate\Support\Str;

final class File extends BaseDTO
{
    public function __construct(
        public string          $id,
        public string          $name,
        public string          $templateId,
        public string          $userId,
        public string          $payload,
        public ?string         $path,
        public string          $storageDisk,
        public ?int            $fileSize,
        public ?string         $organizationId,
        public ?string         $expiresAt,
        public bool            $readyToDownload,
        public FileStatusEnum  $status,
        public ?string         $errors,
        public DateTimeImmutable $createdAt,
        public DateTimeImmutable $updatedAt,
    ) {}

    public static function create(
        string  $name,
        string  $templateId,
        string  $userId,
        string  $payload,
        string  $storageDisk = 'local',
        ?string $organizationId = null,
        ?string $expiresAt = null,
    ): self {
        return new self(
            id:             Str::orderedUuid()->toString(),
            name:           $name,
            templateId:     $templateId,
            userId:         $userId,
            payload:        $payload,
            path:           null,
            storageDisk:    $storageDisk,
            fileSize:       null,
            organizationId: $organizationId,
            expiresAt:      $expiresAt,
            readyToDownload: false,
            status:         FileStatusEnum::PROCESSING,
            errors:         null,
            createdAt:      new DateTimeImmutable(),
            updatedAt:      new DateTimeImmutable(),
        );
    }

    public static function restore(
        string          $id,
        string          $name,
        string          $templateId,
        string          $userId,
        string          $payload,
        ?string         $path,
        string          $storageDisk,
        ?int            $fileSize,
        ?string         $organizationId,
        ?string         $expiresAt,
        ?bool           $readyToDownload,
        FileStatusEnum  $status,
        ?string         $errors,
        DateTimeImmutable $createdAt,
        DateTimeImmutable $updatedAt,
    ): self {
        return new self(
            id:             $id,
            name:           $name,
            templateId:     $templateId,
            userId:         $userId,
            payload:        $payload,
            path:           $path,
            storageDisk:    $storageDisk,
            fileSize:       $fileSize,
            organizationId: $organizationId,
            expiresAt:      $expiresAt,
            readyToDownload: $readyToDownload ?? false,
            status:         $status,
            errors:         $errors,
            createdAt:      $createdAt,
            updatedAt:      $updatedAt,
        );
    }

    public function update(
        ?string        $name = null,
        ?string        $payload = null,
        ?string        $path = null,
        ?string        $storageDisk = null,
        ?int           $fileSize = null,
        ?bool          $readyToDownload = null,
        ?FileStatusEnum $status = null,
        ?string        $errors = null,
    ): self {
        return new self(
            id:             $this->id,
            name:           $name ?? $this->name,
            templateId:     $this->templateId,
            userId:         $this->userId,
            payload:        $payload ?? $this->payload,
            path:           $path ?? $this->path,
            storageDisk:    $storageDisk ?? $this->storageDisk,
            fileSize:       $fileSize ?? $this->fileSize,
            organizationId: $this->organizationId,
            expiresAt:      $this->expiresAt,
            readyToDownload: $readyToDownload ?? $this->readyToDownload,
            status:         $status ?? $this->status,
            errors:         $errors ?? $this->errors,
            createdAt:      $this->createdAt,
            updatedAt:      new DateTimeImmutable(),
        );
    }
}
