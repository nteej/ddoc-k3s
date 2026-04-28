<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\Services\JwtService;
use App\Domain\Entities\OrganizationMember;
use App\Infrastructure\Kafka\Producers\KafkaProducer;
use App\Infrastructure\Repositories\OrganizationRepository;
use App\Infrastructure\Repositories\UserRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrganizationController extends BaseController
{
    public function __construct(
        private readonly OrganizationRepository $orgRepo,
        private readonly UserRepository         $userRepo,
        private readonly KafkaProducer          $kafka,
    ) {}

    // GET /organizations/current
    public function show(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $org    = $this->orgRepo->findById($claims['organizationId']);

        if (!$org) {
            return response()->json(['message' => 'Organization not found'], 404);
        }

        return $this->successResponse([
            'id'          => $org->id,
            'name'        => $org->name,
            'slug'        => $org->slug,
            'plan'        => $org->plan,
            'max_members' => $org->maxMembers,
        ]);
    }

    // PATCH /organizations/current
    public function update(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $data   = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => ['sometimes', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/', Rule::unique('organizations', 'slug')->ignore($claims['organizationId'])],
        ]);

        $this->orgRepo->update($claims['organizationId'], $data);

        return $this->successResponse(['message' => 'Organization updated']);
    }

    // GET /organizations/current/members
    public function listMembers(Request $request): JsonResponse
    {
        $claims  = $request->attributes->get('loggedUser');
        $members = $this->orgRepo->listMembers($claims['organizationId']);

        return $this->successResponse($members);
    }

    // POST /organizations/current/invitations
    public function invite(Request $request): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $data   = $request->validate([
            'email' => 'required|email',
            'role'  => ['required', Rule::in(['viewer', 'editor', 'admin'])],
        ]);

        $count = $this->orgRepo->memberCount($claims['organizationId']);
        $org   = $this->orgRepo->findById($claims['organizationId']);

        if ($org && $count >= $org->maxMembers) {
            return response()->json(['message' => 'Member limit reached for this plan'], 422);
        }

        $token = $this->orgRepo->createInvitation(
            organizationId: $claims['organizationId'],
            email:          $data['email'],
            role:           $data['role'],
        );

        $this->publishNotification([
            'type'           => 'member.invited',
            'organizationId' => $claims['organizationId'],
            'title'          => 'Organisation invitation sent',
            'body'           => "An invitation was sent to {$data['email']} as {$data['role']}.",
            'sendEmail'      => true,
            'email'          => $data['email'],
            'data'           => ['token' => $token, 'role' => $data['role']],
        ]);

        return $this->successResponse(['token' => $token], 201);
    }

    // PATCH /organizations/current/members/{userId}
    public function updateMemberRole(Request $request, string $userId): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $data   = $request->validate([
            'role' => ['required', Rule::in(['viewer', 'editor', 'admin'])],
        ]);

        if ($userId === $claims['userId']) {
            return response()->json(['message' => 'Cannot change your own role'], 422);
        }

        $this->orgRepo->updateMemberRole($claims['organizationId'], $userId, $data['role']);

        $this->publishNotification([
            'type'           => 'member.role_changed',
            'userId'         => $userId,
            'organizationId' => $claims['organizationId'],
            'title'          => 'Your role has been updated',
            'body'           => "Your role in the organisation was changed to {$data['role']}.",
            'data'           => ['role' => $data['role']],
        ]);

        return $this->successResponse(['message' => 'Role updated']);
    }

    // DELETE /organizations/current/members/{userId}
    public function removeMember(Request $request, string $userId): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');

        if ($userId === $claims['userId']) {
            return response()->json(['message' => 'Cannot remove yourself'], 422);
        }

        $this->orgRepo->removeMember($claims['organizationId'], $userId);

        return $this->successResponse(['message' => 'Member removed']);
    }

    // GET /invitations/{token}  — public
    public function showInvitation(string $token): JsonResponse
    {
        $invitation = $this->orgRepo->findInvitationByToken($token);

        if (!$invitation) {
            return response()->json(['message' => 'Invitation not found or expired'], 404);
        }

        if (now()->isAfter($invitation->expires_at)) {
            return response()->json(['message' => 'Invitation has expired'], 410);
        }

        return $this->successResponse([
            'organization_name' => $invitation->organization_name,
            'organization_slug' => $invitation->organization_slug,
            'email'             => $invitation->email,
            'role'              => $invitation->role,
        ]);
    }

    // POST /invitations/{token}/accept
    public function acceptInvitation(Request $request, string $token): JsonResponse
    {
        $invitation = $this->orgRepo->findInvitationByToken($token);

        if (!$invitation) {
            return response()->json(['message' => 'Invitation not found or expired'], 404);
        }

        if (now()->isAfter($invitation->expires_at)) {
            return response()->json(['message' => 'Invitation has expired'], 410);
        }

        $user = $this->userRepo->findFirstUsingFilters(['email' => $invitation->email]);

        if (!$user) {
            return response()->json(['message' => 'No account with that email exists. Please register first.'], 422);
        }

        $existing = $this->orgRepo->findMember($invitation->organization_id, $user->id);
        if (!$existing) {
            $member = OrganizationMember::create($invitation->organization_id, $user->id, $invitation->role);
            $this->orgRepo->addMember($member);
            $this->userRepo->updateOrganization($user->id, $invitation->organization_id);
        }

        $this->orgRepo->deleteInvitation($token);

        // Notify org admins that a new member joined
        $this->publishNotification([
            'type'           => 'member.joined',
            'organizationId' => $invitation->organization_id,
            'title'          => 'New member joined',
            'body'           => "{$user->name} joined the organisation as {$invitation->role}.",
            'data'           => ['userId' => $user->id, 'role' => $invitation->role],
        ]);

        $org = $this->orgRepo->findById($invitation->organization_id);
        $jwt = app(JwtService::class)->generateToken([
            'userId'           => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'organizationId'   => $invitation->organization_id,
            'organizationSlug' => $invitation->organization_slug,
            'role'             => $existing?->role ?? $invitation->role,
        ]);

        return $this->successResponse([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ])->cookie(cookie(
            name:     'token',
            value:    $jwt,
            minutes:  (int) env('JWT_TTL', 21000) / 60,
            path:     '/',
            domain:   null,
            secure:   false,
            httpOnly: true,
            sameSite: 'Strict',
        ));
    }

    // POST /organizations/switch/{orgId}
    public function switchOrganization(Request $request, string $orgId): JsonResponse
    {
        $claims = $request->attributes->get('loggedUser');
        $member = $this->orgRepo->findMember($orgId, $claims['userId']);

        if (!$member) {
            return response()->json(['message' => 'You are not a member of that organization'], 403);
        }

        $org = $this->orgRepo->findById($orgId);
        $this->userRepo->updateOrganization($claims['userId'], $orgId);

        $jwt = app(JwtService::class)->generateToken([
            'userId'           => $claims['userId'],
            'name'             => $claims['name'],
            'email'            => $claims['email'],
            'organizationId'   => $orgId,
            'organizationSlug' => $org?->slug,
            'role'             => $member->role,
        ]);

        return $this->successResponse(['message' => 'Switched organization'])->cookie(cookie(
            name:     'token',
            value:    $jwt,
            minutes:  (int) env('JWT_TTL', 21000) / 60,
            path:     '/',
            domain:   null,
            secure:   false,
            httpOnly: true,
            sameSite: 'Strict',
        ));
    }

    private function publishNotification(array $payload): void
    {
        try {
            $this->kafka->send('notification.dispatch', $payload);
        } catch (\Throwable) {
            // notifications are best-effort
        }
    }
}
