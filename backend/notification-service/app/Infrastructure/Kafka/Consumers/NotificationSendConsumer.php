<?php

declare(strict_types=1);

namespace App\Infrastructure\Kafka\Consumers;

use App\Application\Handlers\SendNotificationHandler;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Junges\Kafka\Contracts\ConsumerMessage;
use Junges\Kafka\Facades\Kafka;

class NotificationSendConsumer extends Command
{
    protected $signature   = 'kafka:consume-notifications';
    protected $description = 'Consume notification.send events and dispatch to the appropriate channel';

    public function handle(SendNotificationHandler $handler): void
    {
        $this->info('Notification consumer started, waiting for messages...');

        Kafka::consumer()
            ->subscribe('notification.send')
            ->withConsumerGroupId('notification-service')
            ->withHandler(function (ConsumerMessage $message) use ($handler): void {
                try {
                    $handler->handle($message->getBody() ?? []);
                } catch (\Throwable $e) {
                    Log::error('notification.send dispatch error', [
                        'error'   => $e->getMessage(),
                        'payload' => $message->getBody(),
                    ]);
                }
            })
            ->build()
            ->consume();
    }
}
