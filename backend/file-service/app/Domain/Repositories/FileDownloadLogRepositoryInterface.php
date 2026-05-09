<?php

declare(strict_types=1);

namespace App\Domain\Repositories;

use App\Domain\Entities\FileDownloadLog;
use Illuminate\Support\Collection;

interface FileDownloadLogRepositoryInterface
{
    public function insert(FileDownloadLog $log): void;

    public function listForFile(string $fileId): Collection;
}
