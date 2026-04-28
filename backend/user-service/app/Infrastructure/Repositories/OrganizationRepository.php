<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\Organization;
use App\Domain\Entities\OrganizationMember;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrganizationRepository
{
    // ─── Organizations ────────────────────────────────────────────────────────

    public function create(Organization $org): void
    {
        DB::table('organizations')->insert([
            'id'          => $org->id,
            'name'        => $org->name,
            'slug'        => $org->slug,
            'plan'        => $org->plan,
            'owner_id'    => $org->ownerId,
            'max_members' => $org->maxMembers,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    public function findById(string $id): ?Organization
    {
        $row = DB::table('organizations')->where('id', $id)->first();
        return $row ? $this->mapOrg($row) : null;
    }

    public function findBySlug(string $slug): ?Organization
    {
        $row = DB::table('organizations')->where('slug', $slug)->first();
        return $row ? $this->mapOrg($row) : null;
    }

    public function update(string $id, array $fields): void
    {
        DB::table('organizations')
            ->where('id', $id)
            ->update(array_merge($fields, ['updated_at' => now()]));
    }

    // ─── Members ─────────────────────────────────────────────────────────────

    public function addMember(OrganizationMember $member): void
    {
        DB::table('organization_members')->insert([
            'id'              => $member->id,
            'organization_id' => $member->organizationId,
            'user_id'         => $member->userId,
            'role'            => $member->role,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }

    public function findMember(string $organizationId, string $userId): ?OrganizationMember
    {
        $row = DB::table('organization_members')
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->first();

        return $row ? $this->mapMember($row) : null;
    }

    public function updateMemberRole(string $organizationId, string $userId, string $role): void
    {
        DB::table('organization_members')
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->update(['role' => $role, 'updated_at' => now()]);
    }

    public function removeMember(string $organizationId, string $userId): void
    {
        DB::table('organization_members')
            ->where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->delete();
    }

    /** @return array<int, array{id:string, name:string, email:string, photo_url:string|null, role:string}> */
    public function listMembers(string $organizationId): array
    {
        return DB::table('organization_members as om')
            ->join('users as u', 'u.id', '=', 'om.user_id')
            ->where('om.organization_id', $organizationId)
            ->select('u.id', 'u.name', 'u.email', 'u.photo_url', 'om.role')
            ->orderBy('om.created_at')
            ->get()
            ->map(fn($r) => (array) $r)
            ->all();
    }

    public function memberCount(string $organizationId): int
    {
        return (int) DB::table('organization_members')
            ->where('organization_id', $organizationId)
            ->count();
    }

    // ─── Invitations ──────────────────────────────────────────────────────────

    public function createInvitation(string $organizationId, string $email, string $role): string
    {
        $token = bin2hex(random_bytes(32)); // 64 hex chars

        DB::table('organization_invitations')->insert([
            'id'              => (string) Str::orderedUuid(),
            'organization_id' => $organizationId,
            'email'           => $email,
            'role'            => $role,
            'token'           => $token,
            'expires_at'      => now()->addDays(7),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        return $token;
    }

    public function findInvitationByToken(string $token): ?object
    {
        return DB::table('organization_invitations as oi')
            ->join('organizations as o', 'o.id', '=', 'oi.organization_id')
            ->where('oi.token', $token)
            ->select('oi.*', 'o.name as organization_name', 'o.slug as organization_slug')
            ->first();
    }

    public function deleteInvitation(string $token): void
    {
        DB::table('organization_invitations')->where('token', $token)->delete();
    }

    // ─── Mapping ──────────────────────────────────────────────────────────────

    private function mapOrg(object $row): Organization
    {
        return Organization::restore(
            id:         $row->id,
            name:       $row->name,
            slug:       $row->slug,
            plan:       $row->plan,
            ownerId:    $row->owner_id,
            maxMembers: (int) $row->max_members,
        );
    }

    private function mapMember(object $row): OrganizationMember
    {
        return OrganizationMember::restore(
            id:             $row->id,
            organizationId: $row->organization_id,
            userId:         $row->user_id,
            role:           $row->role,
        );
    }
}
