<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileStorageService;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final readonly class DestroyFileHandler
{
    public function __construct(
        private FileRepositoryInterface $fileRepository,
        private FileStorageService      $fileStorageService,
    ) {}

    public function execute(string $fileId): bool
    {
        $file = $this->fileRepository->findOneById($fileId);

        if (!$file) {
            throw new NotFoundHttpException('File not found');
        }

        // Delete from storage first; if storage delete fails we still remove the DB record
        if ($file->path) {
            $this->fileStorageService->delete($file->path, $file->storageDisk);
        }

        return $this->fileRepository->delete($fileId);
    }
}
