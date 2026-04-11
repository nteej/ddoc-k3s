<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\AuditLog;
use Illuminate\Pagination\LengthAwarePaginator;

class AuditLogRepository implements AuditLogRepositoryInterface
{
    public function store(array $data): AuditLog
    {
        return AuditLog::create($data);
    }

    public function findByFilters(array $filters, int $perPage = 50): LengthAwarePaginator
    {
        return AuditLog::query()
            ->when($filters['service'] ?? null, fn($q, $v) => $q->where('service', $v))
            ->when($filters['userId'] ?? null, fn($q, $v) => $q->where('user_id', $v))
            ->when($filters['eventType'] ?? null, fn($q, $v) => $q->where('event_type', $v))
            ->orderBy('occurred_at', 'desc')
            ->paginate($perPage);
    }
}
