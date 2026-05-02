<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\DTOs\ForgotPasswordInputDTO;
use App\Domain\Repositories\UserRepositoryInterface;
use App\Infrastructure\Kafka\Producers\KafkaProducer;
use App\Infrastructure\Mail\PasswordResetMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

final readonly class ForgotPasswordHandler
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
        private KafkaProducer           $producer,
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

        $this->dispatchNotification($input->email, $resetUrl);

        return $token;
    }

    private function dispatchNotification(string $email, string $resetUrl): void
    {
        try {
            $this->producer->send(
                topic: 'notification.send',
                payload: [
                    'channel'  => 'email',
                    'to'       => $email,
                    'template' => 'password-reset',
                    'subject'  => 'Reset your DynaDoc password',
                    'data'     => ['reset_url' => $resetUrl],
                ],
                key: $email,
            );
        } catch (\Throwable $e) {
            Log::warning('Kafka unavailable for password reset, falling back to direct mail', [
                'error' => $e->getMessage(),
            ]);

            try {
                Mail::to($email)->send(new PasswordResetMail($resetUrl));
            } catch (\Throwable) {
                // best-effort
            }
        }
    }
}
