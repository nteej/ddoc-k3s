<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class NotificationRepository
{
    public function insert(Notification $n): void
    {
        DB::table('notifications')->insert([
            'id'              => $n->id,
            'user_id'         => $n->userId,
            'organization_id' => $n->organizationId,
            'type'            => $n->type,
            'title'           => $n->title,
            'body'            => $n->body,
            'data'            => $n->data ? json_encode($n->data) : null,
            'read_at'         => $n->readAt,
            'created_at'      => $n->createdAt,
        ]);
    }

    public function listForUser(string $userId, int $limit = 20, int $offset = 0): Collection
    {
        return DB::table('notifications')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->offset($offset)
            ->get()
            ->map(fn($r) => $this->map($r));
    }

    public function unreadCount(string $userId): int
    {
        return (int) DB::table('notifications')
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->count();
    }

    public function markRead(string $id, string $userId): void
    {
        DB::table('notifications')
            ->where('id', $id)
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function markAllRead(string $userId): void
    {
        DB::table('notifications')
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    /** Returns user_ids of all admin+ members of an org (for broadcasting org-level events). */
    public function findAdminUserIds(string $organizationId): array
    {
        return DB::table('organization_members')
            ->where('organization_id', $organizationId)
            ->whereIn('role', ['owner', 'admin'])
            ->pluck('user_id')
            ->toArray();
    }

    private function map(object $row): Notification
    {
        return Notification::restore(
            id:             $row->id,
            userId:         $row->user_id,
            organizationId: $row->organization_id,
            type:           $row->type,
            title:          $row->title,
            body:           $row->body,
            data:           $row->data ? json_decode($row->data, true) : null,
            readAt:         $row->read_at,
            createdAt:      $row->created_at,
        );
    }
}
