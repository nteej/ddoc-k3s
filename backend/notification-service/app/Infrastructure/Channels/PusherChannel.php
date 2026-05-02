<?php

declare(strict_types=1);

namespace App\Infrastructure\Channels;

use Illuminate\Support\Facades\Log;
use Pusher\Pusher;

class PusherChannel
{
    public function send(array $payload): void
    {
        $appId   = config('services.pusher.app_id');
        $key     = config('services.pusher.key');
        $secret  = config('services.pusher.secret');
        $cluster = config('services.pusher.cluster', 'eu');

        if (!$appId || !$key || !$secret) {
            Log::warning('Pusher channel not configured — PUSHER_APP_* env vars missing', ['to' => $payload['to']]);
            return;
        }

        $pusher = new Pusher($key, $secret, $appId, ['cluster' => $cluster, 'useTLS' => true]);
        $pusher->trigger(
            channels: $payload['to'],
            event: $payload['event'] ?? 'notification',
            data: $payload['data'] ?? [],
        );
    }
}
