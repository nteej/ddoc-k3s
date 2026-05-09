<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\PackageUpgradeRequest;
use DateTimeImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PackageUpgradeRequestRepository
{
    public function insert(PackageUpgradeRequest $req): void
    {
        DB::table('package_upgrade_requests')->insert([
            'id'                   => $req->id,
            'organization_id'      => $req->organizationId,
            'current_package_slug' => $req->currentPackageSlug,
            'requested_package_id' => $req->requestedPackageId,
            'payment_reference'    => $req->paymentReference,
            'payment_method'       => $req->paymentMethod,
            'status'               => $req->status,
            'approved_by_user_id'  => $req->approvedByUserId,
            'rejection_reason'     => $req->rejectionReason,
            'approved_at'          => $req->approvedAt?->format('Y-m-d H:i:s'),
            'created_at'           => $req->createdAt->format('Y-m-d H:i:s'),
            'updated_at'           => $req->updatedAt->format('Y-m-d H:i:s'),
        ]);
    }

    public function listAll(): Collection
    {
        return DB::table('package_upgrade_requests as r')
            ->join('organizations as o', 'o.id', '=', 'r.organization_id')
            ->join('packages as p', 'p.id', '=', 'r.requested_package_id')
            ->select(
                'r.*',
                'o.name as organization_name',
                'o.plan as organization_current_plan',
                'p.name as requested_package_name',
                'p.slug as requested_package_slug',
            )
            ->orderBy('r.created_at', 'desc')
            ->get()
            ->map(fn($r) => $this->mapWithJoins($r));
    }

    public function findById(string $id): ?object
    {
        $row = DB::table('package_upgrade_requests as r')
            ->join('organizations as o', 'o.id', '=', 'r.organization_id')
            ->join('packages as p', 'p.id', '=', 'r.requested_package_id')
            ->select(
                'r.*',
                'o.name as organization_name',
                'p.name as requested_package_name',
                'p.slug as requested_package_slug',
            )
            ->where('r.id', $id)
            ->first();
        return $row ? $this->mapWithJoins($row) : null;
    }

    public function updateStatus(
        string  $id,
        string  $status,
        ?string $approvedByUserId = null,
        ?string $rejectionReason = null,
    ): void {
        $data = [
            'status'     => $status,
            'updated_at' => now(),
        ];
        if ($approvedByUserId) {
            $data['approved_by_user_id'] = $approvedByUserId;
            $data['approved_at']         = now();
        }
        if ($rejectionReason) {
            $data['rejection_reason'] = $rejectionReason;
        }
        DB::table('package_upgrade_requests')->where('id', $id)->update($data);
    }

    private function mapWithJoins(object $row): object
    {
        return (object) [
            'id'                     => $row->id,
            'organization_id'        => $row->organization_id,
            'organization_name'      => $row->organization_name ?? null,
            'current_package_slug'   => $row->current_package_slug,
            'requested_package_id'   => $row->requested_package_id,
            'requested_package_name' => $row->requested_package_name ?? null,
            'requested_package_slug' => $row->requested_package_slug ?? null,
            'payment_reference'      => $row->payment_reference,
            'payment_method'         => $row->payment_method,
            'status'                 => $row->status,
            'approved_by_user_id'    => $row->approved_by_user_id,
            'rejection_reason'       => $row->rejection_reason,
            'approved_at'            => $row->approved_at,
            'created_at'             => $row->created_at,
            'updated_at'             => $row->updated_at,
        ];
    }
}
