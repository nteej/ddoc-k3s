<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Domain\Repositories\FileEmailLogRepositoryInterface;
use Illuminate\Support\Collection;

final readonly class GetEmailHistoryHandler
{
    public function __construct(
        private FileEmailLogRepositoryInterface $emailLogRepository,
    ) {}

    public function execute(string $fileId): Collection
    {
        return $this->emailLogRepository->listForFile($fileId);
    }
}
