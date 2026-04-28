<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\DTOs\AuthInputDTO;
use App\Application\DTOs\AuthOutputDTO;
use App\Application\Events\UserLoggedIn;
use App\Application\Services\JwtService;
use App\Domain\Entities\User;
use App\Domain\Repositories\UserRepositoryInterface;
use App\Infrastructure\Repositories\OrganizationRepository;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;

final readonly class StoreAuthHandler
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
        private OrganizationRepository  $organizationRepository,
    ) {}

    public function execute(AuthInputDTO $input): AuthOutputDTO
    {
        $user = $this->userRepository->findFirstUsingFilters(['email' => $input->email]);

        if (empty($user) || !Hash::check($input->password, $user->password)) {
            throw new AuthenticationException('Invalid credentials');
        }

        ['token' => $jwt, 'role' => $role] = $this->buildToken($user);

        $outputDTO = new AuthOutputDTO(
            id:    $user->id,
            name:  $user->name,
            email: $user->email,
            token: $jwt,
            role:  $role,
        );

        event(new UserLoggedIn($outputDTO));

        return $outputDTO;
    }

    private function buildToken(User $user): array
    {
        $orgId   = $user->currentOrganizationId;
        $orgSlug = null;
        $role    = 'viewer';

        if ($orgId) {
            $org    = $this->organizationRepository->findById($orgId);
            $member = $this->organizationRepository->findMember($orgId, $user->id);
            $orgSlug = $org?->slug;
            $role    = $member?->role ?? 'viewer';
        }

        $token = app(JwtService::class)->generateToken([
            'userId'           => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'organizationId'   => $orgId,
            'organizationSlug' => $orgSlug,
            'role'             => $role,
        ]);

        return ['token' => $token, 'role' => $role];
    }
}
