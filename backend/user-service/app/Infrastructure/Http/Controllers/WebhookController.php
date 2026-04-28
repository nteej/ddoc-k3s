<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Domain\Entities\Webhook;
use App\Infrastructure\Repositories\OrganizationRepository;
use App\Infrastructure\Repositories\WebhookRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WebhookController extends BaseController
{
    private const PLAN_LIMITS = ['free' => 0, 'pro' => 3, 'enterprise' => PHP_INT_MAX];

    public function __construct(
        private readonly WebhookRepository     $webhookRepo,
        private readonly OrganizationRepository $orgRepo,
    ) {}

    // GET /webhooks
    public function index(Request $request): JsonResponse
    {
        $claims   = $request->attributes->get('loggedUser');
        $webhooks = $this->webhookRepo->listForOrg($claims['organizationId']);

        return $this->successResponse($webhooks->map(fn(Webhook $w) => [
            'id'     => $w->id,
            'url'    => $w->url,
            'events' => $w->events,
            'active' => $w->active,
            'secret' => $w->secret,
        ]));
    }

    // POST /webhooks
    public function store(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $data   = $request->validate([
            'url'      => 'required|url|max:500',
            'events'   => 'required|array|min:1',
            'events.*' => Rule::in(Webhook::ALLOWED_EVENTS),
        ]);

        $org   = $this->orgRepo->findById($claims['organizationId']);
        $limit = self::PLAN_LIMITS[$org?->plan ?? 'free'] ?? 0;

        if ($limit === 0) {
            return response()->json(['message' => 'Webhooks are not available on the free plan'], 422);
        }

        $count = $this->webhookRepo->countForOrg($claims['organizationId']);
        if ($count >= $limit) {
            return response()->json(['message' => "Webhook limit ({$limit}) reached for your plan"], 422);
        }

        $webhook = Webhook::create(
            organizationId: $claims['organizationId'],
            url:            $data['url'],
            events:         $data['events'],
        );

        $this->webhookRepo->insert($webhook);

        return $this->successResponse([
            'id'     => $webhook->id,
            'url'    => $webhook->url,
            'events' => $webhook->events,
            'secret' => $webhook->secret,
        ], 201);
    }

    // DELETE /webhooks/{id}
    public function destroy(Request $request, string $id): JsonResponse
    {
        $claims  = $request->attributes->get('loggedUser');
        $deleted = $this->webhookRepo->delete($id, $claims['organizationId']);

        if (!$deleted) {
            return response()->json(['message' => 'Webhook not found'], 404);
        }

        return $this->successResponse(['message' => 'Webhook removed']);
    }

    // GET /webhooks/{id}/deliveries
    public function deliveries(Request $request, string $id): JsonResponse
    {
        $claims  = $request->attributes->get('loggedUser');
        $webhook = $this->webhookRepo->findById($id);

        if (!$webhook || $webhook->organizationId !== $claims['organizationId']) {
            return response()->json(['message' => 'Webhook not found'], 404);
        }

        $deliveries = $this->webhookRepo->listDeliveries($id);

        return $this->successResponse($deliveries);
    }
}
