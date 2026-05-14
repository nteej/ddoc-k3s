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

        ['token' => $jwt, 'role' => $role, 'isSystemAdmin' => $isSystemAdmin] = $this->buildToken($user);

        $outputDTO = new AuthOutputDTO(
            id:            $user->id,
            name:          $user->name,
            email:         $user->email,
            token:         $jwt,
            role:          $role,
            isSystemAdmin: $isSystemAdmin,
        );

        event(new UserLoggedIn($outputDTO));

        return $outputDTO;
    }

    private function buildToken(User $user): array
    {
        $orgId        = $user->currentOrganizationId;
        $orgSlug      = null;
        $role         = 'viewer';
        $isSystemAdmin = $this->isSystemAdmin($user->email);

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
            'isSystemAdmin'    => $isSystemAdmin,
        ]);

        return ['token' => $token, 'role' => $role, 'isSystemAdmin' => $isSystemAdmin];
    }

    private function isSystemAdmin(string $email): bool
    {
        $adminEmail = env('SYSTEM_ADMIN_EMAIL', '');
        return $adminEmail !== '' && strtolower($email) === strtolower($adminEmail);
    }
}
