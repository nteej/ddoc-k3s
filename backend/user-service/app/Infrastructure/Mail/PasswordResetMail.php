<?php

declare(strict_types=1);

namespace App\Infrastructure\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class PasswordResetMail extends Mailable
{
    public function __construct(
        public readonly string $resetUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Reset your DynaDoc password');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-reset');
    }
}
