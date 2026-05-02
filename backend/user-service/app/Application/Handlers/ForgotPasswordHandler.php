<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\DTOs\ForgotPasswordInputDTO;
use App\Domain\Repositories\UserRepositoryInterface;
use App\Infrastructure\Mail\PasswordResetMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

final readonly class ForgotPasswordHandler
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
    ) {}

    public function execute(ForgotPasswordInputDTO $input): ?string
    {
        $user = $this->userRepository->findFirstUsingFilters(['email' => $input->email]);

        if (!$user) {
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

        $resetUrl = rtrim(env('FRONTEND_URL', 'https://ddoc.fi'), '/')
            . '/reset-password?token=' . $token
            . '&email=' . urlencode($input->email);

        Mail::to($input->email)->send(new PasswordResetMail($resetUrl));

        return $token;
    }
}
