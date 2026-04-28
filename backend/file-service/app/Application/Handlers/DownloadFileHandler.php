<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileStorageService;
use App\Domain\Entities\File;
use Exception;

final readonly class DownloadFileHandler
{
    public function __construct(
        private FileRepositoryInterface $fileRepository,
        private FileStorageService      $fileStorageService,
    ) {}

    public function execute(string $fileId): object
    {
        $file = $this->fileRepository->findAllUsingFilters(['id' => $fileId])[0] ?? null;

        if (!$file instanceof File) {
            throw new Exception("File {$fileId} not found.");
        }

        if (empty($file->path)) {
            throw new Exception("File {$fileId} has no storage path yet.");
        }

        $disk = $file->storageDisk;

        // For S3-compatible disks return a presigned URL so PHP doesn't proxy the bytes
        $presignedUrl = $this->fileStorageService->temporaryUrl($file->path, $disk);
        if ($presignedUrl) {
            return (object)[
                'name'         => $file->name,
                'content'      => null,
                'presigned_url' => $presignedUrl,
            ];
        }

        // Local disk — stream content directly
        $content = $this->fileStorageService->download($file->path, $disk);

        return (object)[
            'name'         => $file->name,
            'content'      => $content,
            'presigned_url' => null,
        ];
    }
}
