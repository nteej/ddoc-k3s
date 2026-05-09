<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Domain\Entities\File;
use App\Domain\Entities\FileDownloadLog;
use App\Domain\Repositories\FileDownloadLogRepositoryInterface;
use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileStorageService;
use Exception;

final readonly class DownloadFileHandler
{
    public function __construct(
        private FileRepositoryInterface          $fileRepository,
        private FileStorageService               $fileStorageService,
        private FileDownloadLogRepositoryInterface $downloadLogRepository,
    ) {}

    public function execute(string $fileId, string $userId, ?string $ipAddress = null): object
    {
        $file = $this->fileRepository->findAllUsingFilters(['id' => $fileId])[0] ?? null;

        if (!$file instanceof File) {
            throw new Exception("File {$fileId} not found.");
        }

        if (empty($file->path)) {
            throw new Exception("File {$fileId} has no storage path yet.");
        }

        $content = $this->fileStorageService->download($file->path, $file->storageDisk);

        $this->downloadLogRepository->insert(FileDownloadLog::create(
            fileId:             $fileId,
            downloadedByUserId: $userId,
            ipAddress:          $ipAddress,
        ));

        return (object)[
            'name'    => $file->name,
            'content' => $content,
        ];
    }
}
