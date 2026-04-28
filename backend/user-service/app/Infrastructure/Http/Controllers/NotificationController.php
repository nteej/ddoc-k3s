<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Domain\Entities\Notification;
use App\Infrastructure\Repositories\NotificationRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends BaseController
{
    public function __construct(private readonly NotificationRepository $repo) {}

    // GET /notifications?limit=20&offset=0
    public function index(Request $request): JsonResponse
    {
        $claims  = $request->attributes->get('loggedUser');
        $userId  = $claims['userId'];
        $limit   = min((int) $request->query('limit', 20), 50);
        $offset  = (int) $request->query('offset', 0);

        $items = $this->repo->listForUser($userId, $limit, $offset);

        return $this->successResponse($items->map(fn(Notification $n) => [
            'id'              => $n->id,
            'type'            => $n->type,
            'title'           => $n->title,
            'body'            => $n->body,
            'data'            => $n->data,
            'read_at'         => $n->readAt,
            'created_at'      => $n->createdAt,
            'organization_id' => $n->organizationId,
        ]));
    }

    // GET /notifications/unread-count
    public function unreadCount(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        return $this->successResponse(['count' => $this->repo->unreadCount($claims['userId'])]);
    }

    // PATCH /notifications/{id}/read
    public function markRead(Request $request, string $id): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $this->repo->markRead($id, $claims['userId']);
        return $this->successResponse(['message' => 'Marked as read']);
    }

    // POST /notifications/read-all
    public function markAllRead(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $this->repo->markAllRead($claims['userId']);
        return $this->successResponse(['message' => 'All notifications marked as read']);
    }
}
