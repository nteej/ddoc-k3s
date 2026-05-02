<?php

declare(strict_types=1);

namespace App\Infrastructure\Channels;

use App\Infrastructure\Mail\TemplateMail;
use Illuminate\Support\Facades\Mail;

class EmailChannel
{
    public function send(array $payload): void
    {
        Mail::to($payload['to'])->send(new TemplateMail(
            template: $payload['template'] ?? 'generic',
            mailSubject: $payload['subject'] ?? config('mail.from.name') . ' Notification',
            data: $payload['data'] ?? [],
        ));
    }
}
