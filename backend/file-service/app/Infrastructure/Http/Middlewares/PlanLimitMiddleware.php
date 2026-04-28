<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middlewares;

use App\Infrastructure\Kafka\Producers\KafkaProducer;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\Response;

class PlanLimitMiddleware
{
    private const DOC_LIMITS = ['free' => 50, 'pro' => 500, 'enterprise' => PHP_INT_MAX];

    public function __construct(private readonly KafkaProducer $kafka) {}

    public function handle(Request $request, Closure $next): Response
    {
        $claims = $request->attributes->get('loggedUser');
        $orgId  = $claims['organizationId'] ?? null;
        $plan   = $claims['plan'] ?? 'free';

        if (!$orgId) {
            return $next($request);
        }

        $limit = self::DOC_LIMITS[$plan] ?? self::DOC_LIMITS['free'];
        $key   = 'quota:docs:' . $orgId . ':' . now()->format('Y-m');

        $current = (int) Redis::get($key);

        if ($current >= $limit) {
            $this->publishQuotaNotification('quota.exceeded', $orgId, $current, $limit);
            return response()->json([
                'message' => "Monthly document limit ({$limit}) reached. Upgrade your plan.",
                'quota'   => ['used' => $current, 'limit' => $limit],
            ], 402);
        }

        $response = $next($request);

        if ($response->isSuccessful()) {
            $ttl = now()->addDays(32)->diffInSeconds(now());
            Redis::pipeline(function ($pipe) use ($key, $ttl) {
                $pipe->incr($key);
                $pipe->expire($key, $ttl);
            });

            $newCount = $current + 1;
            if ($limit !== PHP_INT_MAX && $newCount / $limit >= 0.8 && $current / $limit < 0.8) {
                $this->publishQuotaNotification('quota.warning', $orgId, $newCount, $limit);
            }
        }

        return $response;
    }

    private function publishQuotaNotification(string $type, string $orgId, int $used, int $limit): void
    {
        try {
            $percent = $limit > 0 ? (int) round($used / $limit * 100) : 100;
            $this->kafka->send('notification.dispatch', [
                'type'           => $type,
                'organizationId' => $orgId,
                'title'          => $type === 'quota.exceeded' ? 'Document quota exceeded' : 'Document quota at 80%',
                'body'           => $type === 'quota.exceeded'
                    ? "You have used all {$limit} documents in your monthly quota."
                    : "You have used {$used} of {$limit} documents ({$percent}%) this month.",
                'data'           => ['used' => $used, 'limit' => $limit, 'percent' => $percent],
            ]);
        } catch (\Throwable) {}
    }
}
