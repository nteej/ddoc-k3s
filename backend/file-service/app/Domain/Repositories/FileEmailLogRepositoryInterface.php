<?php

declare(strict_types=1);

namespace App\Domain\Repositories;

use App\Domain\Entities\FileEmailLog;
use Illuminate\Support\Collection;

interface FileEmailLogRepositoryInterface
{
    public function insert(FileEmailLog $log): void;

    public function listForFile(string $fileId): Collection;

    public function countForFile(string $fileId): int;
}
