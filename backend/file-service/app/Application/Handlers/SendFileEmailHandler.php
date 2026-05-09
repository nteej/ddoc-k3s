<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Domain\Entities\File;
use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileStorageService;
use App\Infrastructure\Mail\PdfAttachmentMail;
use Exception;
use Illuminate\Support\Facades\Mail;

final readonly class SendFileEmailHandler
{
    public function __construct(
        private FileRepositoryInterface $fileRepository,
        private FileStorageService      $fileStorageService,
    ) {}

    public function execute(string $fileId, string $recipientEmail): void
    {
        $file = $this->fileRepository->findAllUsingFilters(['id' => $fileId])[0] ?? null;

        if (!$file instanceof File) {
            throw new Exception("File {$fileId} not found.");
        }

        if (!$file->readyToDownload || empty($file->path)) {
            throw new Exception("File {$fileId} is not ready for download.");
        }

        $content = $this->fileStorageService->download($file->path, $file->storageDisk);

        Mail::to($recipientEmail)->send(new PdfAttachmentMail($file->name, $content));
    }
}
