<?php
declare(strict_types=1);

namespace App\Application\DTOs;

final class RegisterInputDTO extends BaseDTO
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
    ) {
    }
}
