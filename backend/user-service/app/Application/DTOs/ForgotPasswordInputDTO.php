<?php

declare(strict_types=1);

namespace App\Application\DTOs;

final class ForgotPasswordInputDTO extends BaseDTO
{
    public function __construct(
        public string $email,
    ) {}
}
