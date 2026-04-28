<?php

declare(strict_types=1);

namespace App\Infrastructure\Kafka\Consumers;

use App\Application\Services\NotificationService;
use App\Infrastructure\Repositories\NotificationRepository;
use App\Infrastructure\Repositories\UserRepository;
use Illuminate\Console\Command;
use Junges\Kafka\Facades\Kafka;
use Junges\Kafka\Message\ConsumedMessage;

class NotificationDispatchConsumer extends Command
{
    protected $signature   = 'kafka:consume-notification-dispatch';
    protected $description = 'Consume notification.dispatch events and persist in-app notifications';

    public function __construct(
        private readonly NotificationService     $notificationService,
        private readonly NotificationRepository  $notificationRepo,
        private readonly UserRepository          $userRepo,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Starting notification.dispatch consumer...');

        Kafka::consumer()
            ->subscribe('notification.dispatch')
            ->withHandler(function (ConsumedMessage $message) {
                $body = $message->getBody();
                $this->process($body);
            })
            ->build()
            ->consume();

        return self::SUCCESS;
    }

    private function process(array $body): void
    {
        $type   = $body['type']           ?? null;
        $orgId  = $body['organizationId'] ?? null;
        $userId = $body['userId']         ?? null;
        $title  = $body['title']          ?? 'Notification';
        $text   = $body['body']           ?? '';
        $data   = $body['data']           ?? null;
        $email  = $body['email']          ?? null;
        $sendEmail = (bool) ($body['sendEmail'] ?? false);

        if (!$type) return;

        // Deliver to a specific user
        if ($userId) {
            $this->notificationService->notify($userId, $type, $title, $text, $data, $orgId);

            if ($sendEmail && $email) {
                $this->notificationService->sendEmail($email, $title, $text);
            } elseif ($sendEmail) {
                // Look up email from DB
                $user = $this->userRepo->findFirstUsingFilters(['id' => $userId]);
                if ($user) {
                    $this->notificationService->sendEmail($user->email, $title, $text);
                }
            }
            return;
        }

        // Deliver to all org admins
        if ($orgId) {
            $this->notificationService->notifyAdmins($orgId, $type, $title, $text, $data);

            if ($sendEmail && $email) {
                $this->notificationService->sendEmail($email, $title, $text);
            }
        }
    }
}
