<?php

declare(strict_types=1);

namespace App\Domain\Entities;

final class Package
{
    public function __construct(
        public readonly string  $id,
        public readonly string  $name,
        public readonly string  $slug,
        public readonly ?string $description,
        public readonly float   $priceMonthly,
        public readonly float   $priceYearly,
        public readonly int     $maxApiKeys,
        public readonly int     $maxMembers,
        public readonly int     $maxMonthlyGenerations,
        public readonly int     $maxFileStorageMb,
        public readonly ?array  $features,
        public readonly bool    $isActive,
        public readonly int     $sortOrder,
    ) {}

    public function toArray(): array
    {
        return [
            'id'                       => $this->id,
            'name'                     => $this->name,
            'slug'                     => $this->slug,
            'description'              => $this->description,
            'price_monthly'            => $this->priceMonthly,
            'price_yearly'             => $this->priceYearly,
            'max_api_keys'             => $this->maxApiKeys,
            'max_members'              => $this->maxMembers,
            'max_monthly_generations'  => $this->maxMonthlyGenerations,
            'max_file_storage_mb'      => $this->maxFileStorageMb,
            'features'                 => $this->features ?? [],
            'is_active'                => $this->isActive,
            'sort_order'               => $this->sortOrder,
        ];
    }
}
