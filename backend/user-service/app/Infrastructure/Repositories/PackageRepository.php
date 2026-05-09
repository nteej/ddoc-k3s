<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\Package;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PackageRepository
{
    public function findAll(bool $activeOnly = false): Collection
    {
        $query = DB::table('packages')->orderBy('sort_order');
        if ($activeOnly) {
            $query->where('is_active', true);
        }
        return $query->get()->map(fn($r) => $this->map($r));
    }

    public function findById(string $id): ?Package
    {
        $row = DB::table('packages')->where('id', $id)->first();
        return $row ? $this->map($row) : null;
    }

    public function findBySlug(string $slug): ?Package
    {
        $row = DB::table('packages')->where('slug', $slug)->first();
        return $row ? $this->map($row) : null;
    }

    public function insert(array $data): Package
    {
        $id = Str::orderedUuid()->toString();
        DB::table('packages')->insert(array_merge($data, [
            'id'         => $id,
            'created_at' => now(),
            'updated_at' => now(),
        ]));
        return $this->findById($id);
    }

    public function update(string $id, array $data): bool
    {
        return (bool) DB::table('packages')
            ->where('id', $id)
            ->update(array_merge($data, ['updated_at' => now()]));
    }

    public function delete(string $id): bool
    {
        return (bool) DB::table('packages')->where('id', $id)->delete();
    }

    private function map(object $row): Package
    {
        return new Package(
            id:                    $row->id,
            name:                  $row->name,
            slug:                  $row->slug,
            description:           $row->description,
            priceMonthly:          (float) $row->price_monthly,
            priceYearly:           (float) $row->price_yearly,
            maxApiKeys:            (int) $row->max_api_keys,
            maxMembers:            (int) $row->max_members,
            maxMonthlyGenerations: (int) $row->max_monthly_generations,
            maxFileStorageMb:      (int) $row->max_file_storage_mb,
            features:              $row->features ? json_decode($row->features, true) : null,
            isActive:              (bool) $row->is_active,
            sortOrder:             (int) $row->sort_order,
        );
    }
}
