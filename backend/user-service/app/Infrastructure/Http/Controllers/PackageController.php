<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Infrastructure\Repositories\PackageRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackageController extends BaseController
{
    public function __construct(private readonly PackageRepository $packages) {}

    public function index(): JsonResponse
    {
        $pkgs = $this->packages->findAll();
        return $this->successResponse($pkgs->map->toArray()->values());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                    => 'required|string|max:100',
            'slug'                    => 'required|string|max:100|unique:packages,slug',
            'description'             => 'nullable|string',
            'price_monthly'           => 'nullable|numeric|min:0',
            'price_yearly'            => 'nullable|numeric|min:0',
            'max_api_keys'            => 'nullable|integer|min:-1',
            'max_members'             => 'nullable|integer|min:-1',
            'max_monthly_generations' => 'nullable|integer|min:-1',
            'max_file_storage_mb'     => 'nullable|integer|min:-1',
            'features'                => 'nullable|array',
            'is_active'               => 'nullable|boolean',
            'sort_order'              => 'nullable|integer',
        ]);

        if (isset($data['features'])) {
            $data['features'] = json_encode($data['features']);
        }

        $pkg = $this->packages->insert($data);
        return $this->successResponse($pkg->toArray(), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $pkg = $this->packages->findById($id);
        if (!$pkg) {
            return response()->json(['message' => 'Package not found'], 404);
        }

        $data = $request->validate([
            'name'                    => 'sometimes|string|max:100',
            'slug'                    => "sometimes|string|max:100|unique:packages,slug,{$id}",
            'description'             => 'nullable|string',
            'price_monthly'           => 'nullable|numeric|min:0',
            'price_yearly'            => 'nullable|numeric|min:0',
            'max_api_keys'            => 'nullable|integer|min:-1',
            'max_members'             => 'nullable|integer|min:-1',
            'max_monthly_generations' => 'nullable|integer|min:-1',
            'max_file_storage_mb'     => 'nullable|integer|min:-1',
            'features'                => 'nullable|array',
            'is_active'               => 'nullable|boolean',
            'sort_order'              => 'nullable|integer',
        ]);

        if (isset($data['features'])) {
            $data['features'] = json_encode($data['features']);
        }

        $this->packages->update($id, $data);
        $updated = $this->packages->findById($id);
        return $this->successResponse($updated->toArray());
    }

    public function destroy(string $id): JsonResponse
    {
        $pkg = $this->packages->findById($id);
        if (!$pkg) {
            return response()->json(['message' => 'Package not found'], 404);
        }

        $this->packages->delete($id);
        return $this->successResponse(['message' => 'Package deleted']);
    }
}
