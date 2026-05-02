<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\Handlers\SendNotificationHandler;
use App\Infrastructure\Http\Requests\SendNotificationRequest;
use Illuminate\Http\JsonResponse;

class NotificationController extends BaseController
{
    public function send(SendNotificationRequest $request, SendNotificationHandler $handler): JsonResponse
    {
        try {
            $handler->handle($request->validated());
            return $this->successResponse(['message' => 'Notification dispatched']);
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
}
