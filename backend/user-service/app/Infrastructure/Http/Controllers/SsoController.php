<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\Services\JwtService;
use App\Domain\Entities\Organization;
use App\Domain\Entities\OrganizationMember;
use App\Domain\Entities\User;
use App\Infrastructure\Repositories\OrganizationRepository;
use App\Infrastructure\Repositories\UserRepository;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

class SsoController extends BaseController
{
    public function __construct(
        private readonly UserRepository         $userRepo,
        private readonly OrganizationRepository $orgRepo,
    ) {}

    public function redirect(string $provider): RedirectResponse
    {
        $this->guardProvider($provider);
        return Socialite::driver($provider)->stateless()->redirect();
    }

    public function callback(string $provider): RedirectResponse
    {
        $this->guardProvider($provider);

        try {
            $ssoUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable) {
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/login?error=sso_failed');
        }

        // Find existing user by provider_id or email
        $user = $this->userRepo->findFirstUsingFilters(['provider_id' => $ssoUser->getId()])
            ?? $this->userRepo->findFirstUsingFilters(['email' => $ssoUser->getEmail()]);

        if (!$user) {
            $user = User::createForSso(
                name:       $ssoUser->getName() ?? $ssoUser->getNickname() ?? 'User',
                email:      $ssoUser->getEmail(),
                provider:   $provider,
                providerId: $ssoUser->getId(),
                photoUrl:   $ssoUser->getAvatar(),
            );
            $this->userRepo->insert($user);

            $org    = Organization::create(name: $user->name, ownerId: $user->id);
            $member = OrganizationMember::create($org->id, $user->id, 'owner');
            $this->orgRepo->create($org);
            $this->orgRepo->addMember($member);
            $this->userRepo->updateOrganization($user->id, $org->id);

            $orgId   = $org->id;
            $orgSlug = $org->slug;
            $role    = 'owner';
        } else {
            $orgId   = $user->currentOrganizationId;
            $orgSlug = $orgId ? $this->orgRepo->findById($orgId)?->slug : null;
            $member  = $orgId ? $this->orgRepo->findMember($orgId, $user->id) : null;
            $role    = $member?->role ?? 'viewer';
        }

        $jwt = app(JwtService::class)->generateToken([
            'userId'           => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'organizationId'   => $orgId,
            'organizationSlug' => $orgSlug,
            'role'             => $role,
        ]);

        $cookie = cookie(
            name:     'token',
            value:    $jwt,
            minutes:  (int) env('JWT_TTL', 21000) / 60,
            path:     '/',
            domain:   null,
            secure:   false,
            httpOnly: true,
            sameSite: 'Strict',
        );

        return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/documents')
            ->cookie($cookie);
    }

    private function guardProvider(string $provider): void
    {
        if (!in_array($provider, ['google', 'github'], true)) {
            abort(404, "Unsupported SSO provider: $provider");
        }
    }
}
