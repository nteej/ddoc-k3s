<?php

declare(strict_types=1);

namespace App\Infrastructure\Kafka\Consumers;

use App\Infrastructure\Repositories\AuditLogRepositoryInterface;
use Illuminate\Console\Command;
use Junges\Kafka\Facades\Kafka;
use Junges\Kafka\Message\ConsumedMessage;

class UserLoggedConsumer extends Command
{
    protected $signature = 'kafka:consume-user-logged';
    protected $description = 'Consume user.logged Kafka topic and persist login audit logs';

    public function __construct(private AuditLogRepositoryInterface $repository)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Starting user.logged consumer...');

        Kafka::consumer()
            ->subscribe('user.logged')
            ->withHandler(function (ConsumedMessage $message) {
                $body = $message->getBody();

                $this->repository->store([
                    'user_id'         => $body['id'] ?? null,
                    'user_name'       => $body['name'] ?? null,
                    'organization_id' => $body['organizationId'] ?? null,
                    'action'          => 'POST /api/auth/login',
                    'service'         => 'user-service',
                    'status_code'     => 200,
                    'event_type'      => 'user_login',
                    'occurred_at'     => now()->toIso8601String(),
                ]);

                echo "Login event stored for user: {$body['name']}" . PHP_EOL;
            })
            ->build()
            ->consume();

        return Command::SUCCESS;
    }
}
