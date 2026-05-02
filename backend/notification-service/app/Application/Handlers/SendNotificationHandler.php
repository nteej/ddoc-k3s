<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Infrastructure\Channels\EmailChannel;
use App\Infrastructure\Channels\PusherChannel;
use App\Infrastructure\Channels\SmsChannel;

final class SendNotificationHandler
{
    public function __construct(
        private readonly EmailChannel  $email,
        private readonly SmsChannel    $sms,
        private readonly PusherChannel $pusher,
    ) {}

    public function handle(array $payload): void
    {
        match ($payload['channel'] ?? 'email') {
            'sms'    => $this->sms->send($payload),
            'pusher' => $this->pusher->send($payload),
            default  => $this->email->send($payload),
        };
    }
}
