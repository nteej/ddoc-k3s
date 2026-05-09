<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use DateTimeImmutable;
use Illuminate\Support\Str;

final class PackageUpgradeRequest
{
    public function __construct(
        public readonly string            $id,
        public readonly string            $organizationId,
        public readonly string            $currentPackageSlug,
        public readonly string            $requestedPackageId,
        public readonly ?string           $paymentReference,
        public readonly string            $paymentMethod,
        public readonly string            $status,
        public readonly ?string           $approvedByUserId,
        public readonly ?string           $rejectionReason,
        public readonly ?DateTimeImmutable $approvedAt,
        public readonly DateTimeImmutable  $createdAt,
        public readonly DateTimeImmutable  $updatedAt,
    ) {}

    public static function create(
        string  $organizationId,
        string  $currentPackageSlug,
        string  $requestedPackageId,
        ?string $paymentReference = null,
        string  $paymentMethod = 'klarna',
    ): self {
        $now = new DateTimeImmutable();
        return new self(
            id:                 Str::orderedUuid()->toString(),
            organizationId:     $organizationId,
            currentPackageSlug: $currentPackageSlug,
            requestedPackageId: $requestedPackageId,
            paymentReference:   $paymentReference,
            paymentMethod:      $paymentMethod,
            status:             'pending',
            approvedByUserId:   null,
            rejectionReason:    null,
            approvedAt:         null,
            createdAt:          $now,
            updatedAt:          $now,
        );
    }

    public function toArray(): array
    {
        return [
            'id'                   => $this->id,
            'organization_id'      => $this->organizationId,
            'current_package_slug' => $this->currentPackageSlug,
            'requested_package_id' => $this->requestedPackageId,
            'payment_reference'    => $this->paymentReference,
            'payment_method'       => $this->paymentMethod,
            'status'               => $this->status,
            'approved_by_user_id'  => $this->approvedByUserId,
            'rejection_reason'     => $this->rejectionReason,
            'approved_at'          => $this->approvedAt?->format('Y-m-d H:i:s'),
            'created_at'           => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at'           => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}
