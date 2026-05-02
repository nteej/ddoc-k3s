<?php

declare(strict_types=1);

namespace App\Infrastructure\Channels;

use Illuminate\Support\Facades\Log;
use Twilio\Rest\Client;

class SmsChannel
{
    public function send(array $payload): void
    {
        $sid   = config('services.twilio.sid');
        $token = config('services.twilio.token');
        $from  = config('services.twilio.from');

        if (!$sid || !$token || !$from) {
            Log::warning('SMS channel not configured — TWILIO_* env vars missing', ['to' => $payload['to']]);
            return;
        }

        $body   = $payload['data']['body'] ?? $payload['data']['message'] ?? '';
        $twilio = new Client($sid, $token);
        $twilio->messages->create($payload['to'], compact('from', 'body'));
    }
}
