<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\AuditLog;
use Illuminate\Pagination\LengthAwarePaginator;

interface AuditLogRepositoryInterface
{
    public function store(array $data): AuditLog;

    public function findByFilters(array $filters, int $perPage = 50): LengthAwarePaginator;
}
