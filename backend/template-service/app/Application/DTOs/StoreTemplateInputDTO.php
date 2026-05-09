<?php
declare(strict_types = 1);

namespace App\Application\DTOs;

use App\Application\DTOs\BaseDTO;

final class StoreTemplateInputDTO extends BaseDTO
{
    public function __construct(
        public readonly string $name,
        public readonly string $description,
        public readonly string $companyId,
        public readonly string $paperFormat = 'A4',
        public readonly string $paperOrientation = 'portrait',
    ) {
    }
}
