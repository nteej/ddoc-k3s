<?php

declare(strict_types=1);

namespace App\Application\Services;

use App\Domain\Entities\Notification;
use App\Infrastructure\Repositories\NotificationRepository;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public function __construct(private readonly NotificationRepository $repo) {}

    /** Create an in-app notification for a single user. */
    public function notify(
        string  $userId,
        string  $type,
        string  $title,
        string  $body,
        ?array  $data = null,
        ?string $organizationId = null,
    ): void {
        $this->repo->insert(Notification::create(
            userId:         $userId,
            type:           $type,
            title:          $title,
            body:           $body,
            data:           $data,
            organizationId: $organizationId,
        ));
    }

    /** Create in-app notifications for all admin+ members of an org. */
    public function notifyAdmins(
        string $organizationId,
        string $type,
        string $title,
        string $body,
        ?array $data = null,
    ): void {
        $adminIds = $this->repo->findAdminUserIds($organizationId);
        foreach ($adminIds as $userId) {
            $this->notify($userId, $type, $title, $body, $data, $organizationId);
        }
    }

    /**
     * Send a best-effort email notification.
     * Uses Laravel Mail; failures are silently swallowed so they never block the caller.
     */
    public function sendEmail(string $toEmail, string $subject, string $body): void
    {
        try {
            Mail::raw($body, function ($m) use ($toEmail, $subject) {
                $m->to($toEmail)->subject($subject);
            });
        } catch (\Throwable) {
            // email is best-effort
        }
    }
}
