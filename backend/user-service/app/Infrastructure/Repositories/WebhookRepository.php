<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\Webhook;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WebhookRepository
{
    public function insert(Webhook $webhook): void
    {
        DB::table('webhooks')->insert([
            'id'              => $webhook->id,
            'organization_id' => $webhook->organizationId,
            'url'             => $webhook->url,
            'secret'          => $webhook->secret,
            'events'          => json_encode($webhook->events),
            'active'          => $webhook->active,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }

    public function findById(string $id): ?Webhook
    {
        $row = DB::table('webhooks')->where('id', $id)->first();
        return $row ? $this->map($row) : null;
    }

    public function listForOrg(string $organizationId): Collection
    {
        return DB::table('webhooks')
            ->where('organization_id', $organizationId)
            ->orderBy('created_at')
            ->get()
            ->map(fn($r) => $this->map($r));
    }

    public function countForOrg(string $organizationId): int
    {
        return (int) DB::table('webhooks')->where('organization_id', $organizationId)->count();
    }

    /** Returns all active webhooks subscribed to the given event, across all orgs. */
    public function findActiveByEvent(string $organizationId, string $event): Collection
    {
        return DB::table('webhooks')
            ->where('organization_id', $organizationId)
            ->where('active', true)
            ->whereJsonContains('events', $event)
            ->get()
            ->map(fn($r) => $this->map($r));
    }

    public function delete(string $id, string $organizationId): bool
    {
        return (bool) DB::table('webhooks')
            ->where('id', $id)
            ->where('organization_id', $organizationId)
            ->delete();
    }

    // ─── Deliveries ──────────────────────────────────────────────────────────

    public function createDelivery(string $webhookId, string $event, array $payload): string
    {
        $id = (string) Str::orderedUuid();
        DB::table('webhook_deliveries')->insert([
            'id'         => $id,
            'webhook_id' => $webhookId,
            'event'      => $event,
            'payload'    => json_encode($payload),
            'status'     => 'pending',
            'attempts'   => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return $id;
    }

    public function updateDelivery(string $id, array $fields): void
    {
        DB::table('webhook_deliveries')
            ->where('id', $id)
            ->update(array_merge($fields, ['updated_at' => now()]));
    }

    public function listDeliveries(string $webhookId, int $limit = 50): Collection
    {
        return DB::table('webhook_deliveries')
            ->where('webhook_id', $webhookId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    public function findPendingDeliveries(): Collection
    {
        return DB::table('webhook_deliveries as wd')
            ->join('webhooks as w', 'w.id', '=', 'wd.webhook_id')
            ->where('wd.status', 'pending')
            ->where(fn($q) => $q->whereNull('wd.next_retry_at')->orWhere('wd.next_retry_at', '<=', now()))
            ->where('w.active', true)
            ->select('wd.*', 'w.url', 'w.secret')
            ->limit(100)
            ->get();
    }

    private function map(object $row): Webhook
    {
        return Webhook::restore(
            id:             $row->id,
            organizationId: $row->organization_id,
            url:            $row->url,
            secret:         $row->secret,
            events:         json_decode($row->events, true),
            active:         (bool) $row->active,
        );
    }
}
