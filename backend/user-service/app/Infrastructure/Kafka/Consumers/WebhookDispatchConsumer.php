<?php

declare(strict_types=1);

namespace App\Infrastructure\Kafka\Consumers;

use App\Infrastructure\Repositories\WebhookRepository;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Junges\Kafka\Facades\Kafka;
use Junges\Kafka\Message\ConsumedMessage;

class WebhookDispatchConsumer extends Command
{
    protected $signature   = 'kafka:consume-webhook-dispatch';
    protected $description = 'Consume webhook.dispatch events and deliver to registered endpoints';

    private const RETRY_DELAYS = [60, 300, 1800]; // seconds: 1 min, 5 min, 30 min

    public function __construct(private readonly WebhookRepository $webhookRepo)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Starting webhook.dispatch consumer...');

        Kafka::consumer()
            ->subscribe('webhook.dispatch')
            ->withHandler(function (ConsumedMessage $message) {
                $body = $message->getBody();
                $this->dispatch($body);
            })
            ->build()
            ->consume();

        return self::SUCCESS;
    }

    private function dispatch(array $body): void
    {
        $event  = $body['event']          ?? null;
        $orgId  = $body['organizationId'] ?? null;

        if (!$event || !$orgId) return;

        $webhooks = $this->webhookRepo->findActiveByEvent($orgId, $event);

        foreach ($webhooks as $webhook) {
            $deliveryId = $this->webhookRepo->createDelivery($webhook->id, $event, $body);
            $this->deliver($deliveryId, $webhook->url, $webhook->secret, $event, $body);
        }
    }

    private function deliver(string $deliveryId, string $url, string $secret, string $event, array $payload): void
    {
        $row = \Illuminate\Support\Facades\DB::table('webhook_deliveries')->where('id', $deliveryId)->first();
        if (!$row) return;

        $attempts = (int) $row->attempts + 1;
        $jsonBody  = json_encode($payload);
        $signature = 'sha256=' . hash_hmac('sha256', $jsonBody, $secret);

        try {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $jsonBody,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 10,
                CURLOPT_HTTPHEADER     => [
                    'Content-Type: application/json',
                    'X-DynaDoc-Event: ' . $event,
                    'X-DynaDoc-Signature: ' . $signature,
                    'X-DynaDoc-Delivery: ' . $deliveryId,
                ],
            ]);

            curl_exec($ch);
            $code  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            $success = !$error && $code >= 200 && $code < 300;

            $update = [
                'attempts'      => $attempts,
                'response_code' => $code ?: null,
                'status'        => $success ? 'success' : 'pending',
                'next_retry_at' => null,
            ];

            if (!$success && $attempts < count(self::RETRY_DELAYS)) {
                $update['next_retry_at'] = now()->addSeconds(self::RETRY_DELAYS[$attempts - 1]);
            } elseif (!$success) {
                $update['status'] = 'failed';
            }

            $this->webhookRepo->updateDelivery($deliveryId, $update);

        } catch (\Throwable $e) {
            $nextRetry = $attempts < count(self::RETRY_DELAYS)
                ? now()->addSeconds(self::RETRY_DELAYS[$attempts - 1])
                : null;

            $this->webhookRepo->updateDelivery($deliveryId, [
                'attempts'      => $attempts,
                'status'        => $nextRetry ? 'pending' : 'failed',
                'next_retry_at' => $nextRetry,
            ]);
        }
    }
}
