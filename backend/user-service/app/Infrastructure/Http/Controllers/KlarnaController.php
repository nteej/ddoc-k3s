<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\Services\KlarnaService;
use App\Domain\Entities\PackageUpgradeRequest;
use App\Infrastructure\Repositories\KlarnaSettingRepository;
use App\Infrastructure\Repositories\OrganizationRepository;
use App\Infrastructure\Repositories\PackageRepository;
use App\Infrastructure\Repositories\PackageUpgradeRequestRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KlarnaController extends BaseController
{
    public function __construct(
        private readonly KlarnaService                   $klarna,
        private readonly KlarnaSettingRepository         $settingRepo,
        private readonly PackageRepository               $packages,
        private readonly PackageUpgradeRequestRepository $upgradeRequests,
        private readonly OrganizationRepository          $organizations,
    ) {}

    // GET /klarna/config — is Klarna configured, and what mode?
    public function config(): JsonResponse
    {
        return $this->successResponse([
            'mode'          => $this->klarna->getMode(),
            'is_configured' => $this->klarna->isConfigured(),
        ]);
    }

    // POST /klarna/sessions — create a Klarna payment session, return client_token
    public function createSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'package_id'     => 'required|uuid|exists:packages,id',
            'billing_period' => 'required|in:monthly,yearly',
        ]);

        $pkg = $this->packages->findById($data['package_id']);
        if (!$pkg || !$pkg->isActive) {
            return response()->json(['message' => 'Package not available'], 422);
        }

        $claims = $request->attributes->get('loggedUser');
        $amount = $data['billing_period'] === 'yearly'
            ? (int) round($pkg->priceYearly * 100)
            : (int) round($pkg->priceMonthly * 100);

        $orderLine = [
            'type'             => 'digital',
            'reference'        => $pkg->slug,
            'name'             => $pkg->name . ' (' . $data['billing_period'] . ')',
            'quantity'         => 1,
            'unit_price'       => $amount,
            'tax_rate'         => 0,
            'total_amount'     => $amount,
            'total_tax_amount' => 0,
        ];

        try {
            $session = $this->klarna->createSession([
                'purchase_country'  => 'FI',
                'purchase_currency' => 'EUR',
                'locale'            => 'en-US',
                'order_amount'      => $amount,
                'order_tax_amount'  => 0,
                'order_lines'       => [$orderLine],
                'billing_address'   => ['email' => $claims['email'] ?? ''],
            ]);

            return $this->successResponse([
                'client_token'              => $session['client_token'],
                'session_id'                => $session['session_id'],
                'payment_method_categories' => $session['payment_method_categories'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    // POST /klarna/complete — create order from authorization_token + create upgrade request
    public function complete(Request $request): JsonResponse
    {
        $data = $request->validate([
            'authorization_token' => 'required|string',
            'package_id'          => 'required|uuid|exists:packages,id',
            'billing_period'      => 'required|in:monthly,yearly',
        ]);

        $pkg = $this->packages->findById($data['package_id']);
        if (!$pkg || !$pkg->isActive) {
            return response()->json(['message' => 'Package not available'], 422);
        }

        $claims = $request->attributes->get('loggedUser');
        $orgId  = $claims['organizationId'] ?? null;
        $org    = $orgId ? $this->organizations->findById($orgId) : null;

        if (!$org) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        if ($pkg->slug === $org->plan) {
            return response()->json(['message' => 'You are already on this plan'], 422);
        }

        $amount = $data['billing_period'] === 'yearly'
            ? (int) round($pkg->priceYearly * 100)
            : (int) round($pkg->priceMonthly * 100);

        try {
            $order = $this->klarna->createOrder($data['authorization_token'], [
                'purchase_country'    => 'FI',
                'purchase_currency'   => 'EUR',
                'locale'              => 'en-US',
                'order_amount'        => $amount,
                'order_tax_amount'    => 0,
                'merchant_reference1' => $org->id,
                'order_lines'         => [[
                    'type'             => 'digital',
                    'reference'        => $pkg->slug,
                    'name'             => $pkg->name . ' (' . $data['billing_period'] . ')',
                    'quantity'         => 1,
                    'unit_price'       => $amount,
                    'tax_rate'         => 0,
                    'total_amount'     => $amount,
                    'total_tax_amount' => 0,
                ]],
                'billing_address' => ['email' => $claims['email'] ?? ''],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Payment failed: ' . $e->getMessage()], 502);
        }

        $upgradeReq = PackageUpgradeRequest::create(
            organizationId:     $org->id,
            currentPackageSlug: $org->plan ?? 'free',
            requestedPackageId: $pkg->id,
            paymentReference:   $order['order_id'],
            paymentMethod:      'klarna',
        );
        $this->upgradeRequests->insert($upgradeReq);

        return $this->successResponse([
            'message'         => 'Payment successful. Upgrade request submitted.',
            'klarna_order_id' => $order['order_id'],
            'request'         => $upgradeReq->toArray(),
        ], 201);
    }
}
