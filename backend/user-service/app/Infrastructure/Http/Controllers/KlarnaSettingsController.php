<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\Services\KlarnaService;
use App\Infrastructure\Repositories\KlarnaSettingRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KlarnaSettingsController extends BaseController
{
    public function __construct(
        private readonly KlarnaSettingRepository $repo,
        private readonly KlarnaService           $klarna,
    ) {}

    // GET /admin/klarna-settings
    public function show(): JsonResponse
    {
        $s = $this->repo->get();

        return $this->successResponse([
            'mode'                    => $s?->mode ?? 'sandbox',
            'sandbox_username'        => $s?->sandboxUsername,
            'sandbox_password_set'    => !empty($s?->sandboxPassword),
            'production_username'     => $s?->productionUsername,
            'production_password_set' => !empty($s?->productionPassword),
            'is_configured'           => $this->klarna->isConfigured(),
        ]);
    }

    // PATCH /admin/klarna-settings
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mode'                => 'sometimes|in:sandbox,production',
            'sandbox_username'    => 'sometimes|nullable|string|max:255',
            'sandbox_password'    => 'sometimes|nullable|string|max:255',
            'production_username' => 'sometimes|nullable|string|max:255',
            'production_password' => 'sometimes|nullable|string|max:255',
        ]);

        // If password fields are empty strings, don't overwrite (preserve existing)
        $existing = $this->repo->get();
        foreach (['sandbox_password', 'production_password'] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $existingVal = $field === 'sandbox_password'
                    ? $existing?->sandboxPassword
                    : $existing?->productionPassword;
                if ($existingVal) {
                    unset($data[$field]);
                }
            }
        }

        $this->repo->upsert($data);

        return $this->successResponse(['message' => 'Klarna settings saved.']);
    }
}
