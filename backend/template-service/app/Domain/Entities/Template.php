<?php
declare(strict_types = 1);

namespace App\Domain\Entities;

use App\Application\DTOs\BaseDTO;
use \DateTimeImmutable;
use Illuminate\Support\Str;

final class Template extends BaseDTO
{
    public function __construct(
        public string $id,
        public string $name,
        public string $description,
        public string $companyId,
        public string $paperFormat = 'A4',
        public string $paperOrientation = 'portrait',
    ) {
    }

    public static function create(
        string $name,
        string $description,
        string $companyId,
        string $paperFormat = 'A4',
        string $paperOrientation = 'portrait',
    ): self
    {
        return new self(
            id: Str::orderedUuid()->toString(),
            name: $name,
            description: $description,
            companyId: $companyId,
            paperFormat: $paperFormat,
            paperOrientation: $paperOrientation,
        );
    }

    public static function restore(
        string $id,
        string $name,
        string $description,
        string $companyId,
        string $paperFormat = 'A4',
        string $paperOrientation = 'portrait',
    ): self
    {
        return new self(
            id: $id,
            name: $name,
            description: $description,
            companyId: $companyId,
            paperFormat: $paperFormat,
            paperOrientation: $paperOrientation,
        );
    }

    public function update(
        ?string $name,
        ?string $description,
        ?string $paperFormat = null,
        ?string $paperOrientation = null,
    ): self
    {
        return new self(
            id: $this->id,
            name: $name ?? $this->name,
            description: $description ?? $this->description,
            companyId: $this->companyId,
            paperFormat: $paperFormat ?? $this->paperFormat,
            paperOrientation: $paperOrientation ?? $this->paperOrientation,
        );
    }
}
