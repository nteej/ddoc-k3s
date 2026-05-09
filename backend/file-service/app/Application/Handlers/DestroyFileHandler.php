<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileStorageService;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final readonly class DestroyFileHandler
{
    public function __construct(
        private FileRepositoryInterface $fileRepository,
        private FileStorageService      $fileStorageService,
    ) {}

    public function execute(string $fileId, string $callerUserId, string $callerRole): bool
    {
        $file = $this->fileRepository->findOneById($fileId);

        if (!$file) {
            throw new NotFoundHttpException('File not found');
        }

        $isOwner = $file->userId === $callerUserId;
        $isAdmin = in_array($callerRole, ['admin', 'owner'], true);

        if (!$isOwner && !$isAdmin) {
            throw new AccessDeniedHttpException('You do not have permission to delete this file.');
        }

        if ($file->path) {
            $this->fileStorageService->delete($file->path, $file->storageDisk);
        }

        return $this->fileRepository->delete($fileId);
    }
}
