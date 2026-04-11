<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\DTOs\ResetPasswordInputDTO;
use App\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final readonly class ResetPasswordHandler
{
    // Tokens expire after 60 minutes.
    private const TOKEN_TTL_MINUTES = 60;

    public function __construct(
        private UserRepositoryInterface $userRepository,
    ) {}

    public function execute(ResetPasswordInputDTO $input): void
    {
        $record = DB::table('password_reset_tokens')
            ->where('email', $input->email)
            ->first();

        if (!$record) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired password reset token.'],
            ]);
        }

        $expired = now()->diffInMinutes($record->created_at) > self::TOKEN_TTL_MINUTES;

        if ($expired || !hash_equals($record->token, hash('sha256', $input->token))) {
            DB::table('password_reset_tokens')->where('email', $input->email)->delete();

            throw ValidationException::withMessages([
                'token' => ['Invalid or expired password reset token.'],
            ]);
        }

        $user = $this->userRepository->findFirstUsingFilters(['email' => $input->email]);

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['User not found.'],
            ]);
        }

        DB::table('users')
            ->where('id', $user->id)
            ->update(['password' => Hash::make($input->password)]);

        DB::table('password_reset_tokens')->where('email', $input->email)->delete();
    }
}
