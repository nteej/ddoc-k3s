<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\DTOs\ForgotPasswordInputDTO;
use App\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class ForgotPasswordHandler
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
    ) {}

    /**
     * Returns the plain-text token (caller is responsible for delivering it
     * to the user — e.g. via email or, in dev mode, directly in the response).
     */
    public function execute(ForgotPasswordInputDTO $input): ?string
    {
        $user = $this->userRepository->findFirstUsingFilters(['email' => $input->email]);

        if (!$user) {
            // Return null silently — never reveal whether an email exists.
            return null;
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->upsert(
            [
                'email'      => $input->email,
                'token'      => hash('sha256', $token),
                'created_at' => now(),
            ],
            uniqueBy: ['email'],
            update: ['token', 'created_at'],
        );

        return $token;
    }
}
