<?php

declare(strict_types=1);

namespace App\Infrastructure\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Storage;

final class TemplateMail extends Mailable
{
    public function __construct(
        private readonly string $template,
        private readonly string $mailSubject,
        public readonly array $data = [],
        private readonly array $storageAttachments = [],
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->mailSubject);
    }

    public function content(): Content
    {
        $view = "emails.{$this->template}";

        return new Content(
            view: view()->exists($view) ? $view : 'emails.generic',
        );
    }

    public function attachments(): array
    {
        return array_map(
            fn(array $a) => Attachment::fromData(
                fn() => Storage::disk($a['disk'])->get($a['path']),
                $a['name'],
            )->withMime($a['mime']),
            $this->storageAttachments,
        );
    }
}
