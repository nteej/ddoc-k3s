<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Domain\Entities\File;
use App\Domain\Entities\FileEmailLog;
use App\Domain\Repositories\FileEmailLogRepositoryInterface;
use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileStorageService;
use App\Infrastructure\Mail\PdfAttachmentMail;
use Exception;
use Illuminate\Support\Facades\Mail;

final readonly class SendFileEmailHandler
{
    public function __construct(
        private FileRepositoryInterface        $fileRepository,
        private FileStorageService             $fileStorageService,
        private FileEmailLogRepositoryInterface $emailLogRepository,
    ) {}

    public function execute(
        string  $fileId,
        string  $recipientEmail,
        string  $sentByUserId,
        ?string $message = null,
    ): void {
        $file = $this->fileRepository->findAllUsingFilters(['id' => $fileId])[0] ?? null;

        if (!$file instanceof File) {
            throw new Exception("File {$fileId} not found.");
        }

        if (!$file->readyToDownload || empty($file->path)) {
            throw new Exception("File {$fileId} is not ready for download.");
        }

        $content = $this->fileStorageService->download($file->path, $file->storageDisk);

        try {
            Mail::to($recipientEmail)->send(new PdfAttachmentMail($file->name, $content, $message));

            $this->emailLogRepository->insert(FileEmailLog::create(
                fileId:         $fileId,
                sentByUserId:   $sentByUserId,
                recipientEmail: $recipientEmail,
                message:        $message,
                status:         'sent',
            ));
        } catch (\Throwable $e) {
            $this->emailLogRepository->insert(FileEmailLog::create(
                fileId:         $fileId,
                sentByUserId:   $sentByUserId,
                recipientEmail: $recipientEmail,
                message:        $message,
                status:         'failed',
                errorMessage:   $e->getMessage(),
            ));
            throw $e;
        }
    }
}
