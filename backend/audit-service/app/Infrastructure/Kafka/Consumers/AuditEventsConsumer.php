<?php

declare(strict_types=1);

namespace App\Infrastructure\Kafka\Consumers;

use App\Infrastructure\Repositories\AuditLogRepositoryInterface;
use Illuminate\Console\Command;
use Junges\Kafka\Facades\Kafka;
use Junges\Kafka\Message\ConsumedMessage;

class AuditEventsConsumer extends Command
{
    protected $signature = 'kafka:consume-audit-events';
    protected $description = 'Consume audit.events Kafka topic and persist audit logs';

    public function __construct(private AuditLogRepositoryInterface $repository)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Starting audit.events consumer...');

        Kafka::consumer()
            ->subscribe('audit.events')
            ->withHandler(function (ConsumedMessage $message) {
                $body = $message->getBody();

                $this->repository->store([
                    'user_id'         => $body['userId'] ?? null,
                    'user_name'       => $body['userName'] ?? null,
                    'organization_id' => $body['organizationId'] ?? null,
                    'action'          => $body['action'] ?? 'unknown',
                    'service'         => $body['service'] ?? 'unknown',
                    'status_code'     => $body['statusCode'] ?? null,
                    'event_type'      => 'http_request',
                    'occurred_at'     => $body['timestamp'] ?? now()->toIso8601String(),
                ]);

                echo "Audit event stored: {$body['action']}" . PHP_EOL;
            })
            ->build()
            ->consume();

        return Command::SUCCESS;
    }
}
