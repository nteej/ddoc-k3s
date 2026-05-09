<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Domain\Entities\PackageUpgradeRequest;
use App\Infrastructure\Repositories\ApiKeyRepository;
use App\Infrastructure\Repositories\OrganizationRepository;
use App\Infrastructure\Repositories\PackageRepository;
use App\Infrastructure\Repositories\PackageUpgradeRequestRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PackageUpgradeController extends BaseController
{
    public function __construct(
        private readonly PackageRepository               $packages,
        private readonly PackageUpgradeRequestRepository $upgradeRequests,
        private readonly OrganizationRepository          $organizations,
        private readonly ApiKeyRepository                $apiKeys,
    ) {}

    // GET /packages — list active packages (all authenticated users)
    public function publicIndex(): JsonResponse
    {
        $pkgs = $this->packages->findAll(activeOnly: true);
        return $this->successResponse($pkgs->map->toArray()->values());
    }

    // GET /organizations/current/package — current package + usage
    public function currentPackage(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $org    = $this->organizations->findById($claims['organizationId']);

        if (!$org) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        $pkg = $org->packageId
            ? $this->packages->findById($org->packageId)
            : $this->packages->findBySlug($org->plan ?? 'free');

        if (!$pkg) {
            $pkg = $this->packages->findBySlug('free');
        }

        $memberCount = DB::table('organization_members')
            ->where('organization_id', $org->id)
            ->count();

        $apiKeyCount = $this->apiKeys->countForOrg($org->id);

        return $this->successResponse([
            'package' => $pkg?->toArray(),
            'usage'   => [
                'api_keys'             => $apiKeyCount,
                'members'              => $memberCount,
                'monthly_generations'  => $org->monthlyGenerationCount ?? 0,
            ],
        ]);
    }

    // POST /organizations/current/upgrade-request
    public function requestUpgrade(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $data   = $request->validate([
            'package_id'        => 'required|uuid|exists:packages,id',
            'payment_reference' => 'nullable|string|max:255',
        ]);

        $org = $this->organizations->findById($claims['organizationId']);
        if (!$org) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        $requestedPkg = $this->packages->findById($data['package_id']);
        if (!$requestedPkg || !$requestedPkg->isActive) {
            return response()->json(['message' => 'Package not available'], 422);
        }

        $currentPlanSlug = $org->plan ?? 'free';
        if ($requestedPkg->slug === $currentPlanSlug) {
            return response()->json(['message' => 'You are already on this plan'], 422);
        }

        $upgradeReq = PackageUpgradeRequest::create(
            organizationId:     $org->id,
            currentPackageSlug: $currentPlanSlug,
            requestedPackageId: $requestedPkg->id,
            paymentReference:   $data['payment_reference'] ?? ('mock-klarna-' . uniqid()),
            paymentMethod:      'klarna',
        );

        $this->upgradeRequests->insert($upgradeReq);

        return $this->successResponse([
            'message' => 'Upgrade request submitted. An admin will review and approve it shortly.',
            'request' => $upgradeReq->toArray(),
        ], 201);
    }

    // GET /admin/upgrade-requests — all requests (admin+)
    public function adminIndex(): JsonResponse
    {
        $requests = $this->upgradeRequests->listAll();
        return $this->successResponse($requests->values());
    }

    // PATCH /admin/upgrade-requests/{id} — approve or reject (admin+)
    public function adminAction(Request $request, string $id): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $data   = $request->validate([
            'action' => 'required|in:approve,reject',
            'reason' => 'nullable|string|max:500',
        ]);

        $upgradeReq = $this->upgradeRequests->findById($id);
        if (!$upgradeReq) {
            return response()->json(['message' => 'Upgrade request not found'], 404);
        }

        if ($upgradeReq->status !== 'pending') {
            return response()->json(['message' => 'This request has already been processed'], 422);
        }

        if ($data['action'] === 'approve') {
            $requestedPkg = $this->packages->findById($upgradeReq->requested_package_id);
            if ($requestedPkg) {
                $this->organizations->update($upgradeReq->organization_id, [
                    'plan'       => $requestedPkg->slug,
                    'package_id' => $requestedPkg->id,
                    'max_members'=> $requestedPkg->maxMembers === -1 ? 9999 : $requestedPkg->maxMembers,
                ]);
            }
            $this->upgradeRequests->updateStatus($id, 'approved', $claims['userId']);
        } else {
            $this->upgradeRequests->updateStatus(
                $id,
                'rejected',
                rejectionReason: $data['reason'] ?? null,
            );
        }

        return $this->successResponse(['message' => "Request {$data['action']}d successfully."]);
    }
}
