<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Infrastructure\Repositories\AuditLogRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends BaseController
{
    public function __construct(private AuditLogRepositoryInterface $repository) {}

    public function index(Request $request): JsonResponse
    {
        $logs = $this->repository->findByFilters([
            'service'   => $request->query('service'),
            'userId'    => $request->query('userId'),
            'eventType' => $request->query('eventType'),
        ]);

        return $this->successResponse($logs);
    }
}
