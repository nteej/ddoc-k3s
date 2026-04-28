<?php

declare(strict_types = 1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\User;
use App\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class UserRepository implements UserRepositoryInterface
{
    public function exists(string $email): bool
    {
        return DB::table('users')
            ->where('email', $email)
            ->exists();
    }

    public function findAllUsingFilters(array $filters = []): Collection
    {
        $query = DB::table('users')
            ->select([
                'id',
                'name',
                'email',
                'password',
                'company_id',
                'photo_url',
                'current_organization_id',
                'provider',
                'provider_id',
            ]);

        foreach ($filters as $key => $value) {
            $query->when($value !== null, fn($q) => $q->where($key, $value));
        }

        return $query->get();
    }

    public function findFirstUsingFilters(array $filters = []): ?User
    {
        $query = DB::table('users')
            ->select([
                'id',
                'name',
                'email',
                'password',
                'company_id',
                'photo_url',
                'current_organization_id',
                'provider',
                'provider_id',
            ]);

        foreach ($filters as $key => $value) {
            $query->when($value !== null, fn($q) => $q->where($key, $value));
        }

        $userData = $query->first();

        if (!$userData) {
            return null;
        }

        return User::restore(
            id:                    $userData->id,
            name:                  $userData->name,
            email:                 $userData->email,
            password:              $userData->password,
            companyId:             $userData->company_id,
            photoUrl:              $userData->photo_url,
            currentOrganizationId: $userData->current_organization_id ?? null,
            provider:              $userData->provider ?? null,
            providerId:            $userData->provider_id ?? null,
        );
    }

    public function insert(User $user): string
    {
        DB::table('users')->insert([
            'id'                      => $user->id,
            'name'                    => $user->name,
            'email'                   => $user->email,
            'password'                => $user->password,
            'company_id'              => $user->companyId,
            'photo_url'               => $user->photoUrl,
            'current_organization_id' => $user->currentOrganizationId,
            'provider'                => $user->provider,
            'provider_id'             => $user->providerId,
        ]);

        return $user->id;
    }

    public function updateOrganization(string $userId, string $organizationId): void
    {
        DB::table('users')
            ->where('id', $userId)
            ->update(['current_organization_id' => $organizationId, 'updated_at' => now()]);
    }

    public function update(User $user): bool
    {
        $updatedUser = DB::table('users')
            ->where('id', '=', $user->id)
            ->update([
                'name' => $user->name,
                'email' => $user->email,
                'password' => $user->password,
                'photo_url' => $user->photoUrl,
            ]);

        return (bool) $updatedUser;
    }
}
