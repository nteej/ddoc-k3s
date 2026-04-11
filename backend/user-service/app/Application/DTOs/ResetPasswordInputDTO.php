<?php

declare(strict_types=1);

namespace App\Application\DTOs;

final class ResetPasswordInputDTO extends BaseDTO
{
    public function __construct(
        public string $email,
        public string $token,
        public string $password,
    ) {}
}
