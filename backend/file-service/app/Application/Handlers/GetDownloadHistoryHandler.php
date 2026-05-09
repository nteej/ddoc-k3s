<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Domain\Repositories\FileDownloadLogRepositoryInterface;
use Illuminate\Support\Collection;

final readonly class GetDownloadHistoryHandler
{
    public function __construct(
        private FileDownloadLogRepositoryInterface $downloadLogRepository,
    ) {}

    public function execute(string $fileId): Collection
    {
        return $this->downloadLogRepository->listForFile($fileId);
    }
}
