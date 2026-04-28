<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\DTOs\AuthOutputDTO;
use App\Application\DTOs\RegisterInputDTO;
use App\Application\Services\JwtService;
use App\Domain\Entities\Organization;
use App\Domain\Entities\OrganizationMember;
use App\Domain\Entities\User;
use App\Domain\Repositories\UserRepositoryInterface;
use App\Infrastructure\Repositories\OrganizationRepository;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final readonly class StoreRegisterHandler
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
        private OrganizationRepository  $organizationRepository,
    ) {}

    public function execute(RegisterInputDTO $input): AuthOutputDTO
    {
        if ($this->userRepository->exists($input->email)) {
            throw ValidationException::withMessages([
                'email' => ['This email is already registered.'],
            ]);
        }

        $user = User::create(
            name:      $input->name,
            email:     $input->email,
            password:  $input->password,
            companyId: Str::orderedUuid()->toString(),
            photoUrl:  null,
        );

        $this->userRepository->insert($user);

        // Auto-create a personal organization for the new user
        $org    = Organization::create(name: $input->name, ownerId: $user->id);
        $member = OrganizationMember::create($org->id, $user->id, 'owner');

        $this->organizationRepository->create($org);
        $this->organizationRepository->addMember($member);
        $this->userRepository->updateOrganization($user->id, $org->id);

        $token = app(JwtService::class)->generateToken([
            'userId'           => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'organizationId'   => $org->id,
            'organizationSlug' => $org->slug,
            'role'             => 'owner',
        ]);

        return new AuthOutputDTO(
            id:    $user->id,
            name:  $user->name,
            email: $user->email,
            token: $token,
            role:  'owner',
        );
    }
}
