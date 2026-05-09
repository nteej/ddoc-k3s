<?php

declare(strict_types=1);

namespace App\Infrastructure\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class PdfAttachmentMail extends Mailable
{
    public function __construct(
        private readonly string $fileName,
        private readonly string $pdfContent,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your document: {$this->fileName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfContent, "{$this->fileName}.pdf")
                ->withMime('application/pdf'),
        ];
    }

    private function buildHtml(): string
    {
        $name = htmlspecialchars($this->fileName);
        return <<<HTML
        <p>Hello,</p>
        <p>Please find your generated document <strong>{$name}</strong> attached to this email.</p>
        <p>Thank you for using DynaDoc.</p>
        HTML;
    }
}
