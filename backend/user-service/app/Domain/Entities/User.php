<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

final class User
{
    private function __construct(
        public string  $id,
        public string  $name,
        public string  $email,
        public ?string $password,
        public string  $companyId,
        public ?string $photoUrl,
        public ?string $currentOrganizationId,
        public ?string $provider,
        public ?string $providerId,
    ) {
        if (!Str::isUuid($id)) {
            throw new \InvalidArgumentException('ID is not an UUID.');
        }

        if (!Str::isUuid($companyId)) {
            throw new \InvalidArgumentException('Company ID is not an UUID.');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email format.');
        }
    }

    public static function create(
        string  $name,
        string  $email,
        string  $password,
        string  $companyId,
        ?string $photoUrl,
        ?string $currentOrganizationId = null,
        ?string $provider = null,
        ?string $providerId = null,
    ): self {
        return new self(
            id:                    Str::orderedUuid()->toString(),
            name:                  $name,
            email:                 $email,
            password:              Hash::make($password),
            companyId:             $companyId,
            photoUrl:              $photoUrl,
            currentOrganizationId: $currentOrganizationId,
            provider:              $provider,
            providerId:            $providerId,
        );
    }

    public static function createForSso(
        string  $name,
        string  $email,
        string  $provider,
        string  $providerId,
        ?string $photoUrl,
    ): self {
        return new self(
            id:                    Str::orderedUuid()->toString(),
            name:                  $name,
            email:                 $email,
            password:              null,
            companyId:             Str::orderedUuid()->toString(),
            photoUrl:              $photoUrl,
            currentOrganizationId: null,
            provider:              $provider,
            providerId:            $providerId,
        );
    }

    public static function restore(
        string  $id,
        string  $name,
        string  $email,
        ?string $password,
        string  $companyId,
        ?string $photoUrl,
        ?string $currentOrganizationId = null,
        ?string $provider = null,
        ?string $providerId = null,
    ): self {
        return new self(
            id:                    $id,
            name:                  $name,
            email:                 $email,
            password:              $password,
            companyId:             $companyId,
            photoUrl:              $photoUrl,
            currentOrganizationId: $currentOrganizationId,
            provider:              $provider,
            providerId:            $providerId,
        );
    }
}
