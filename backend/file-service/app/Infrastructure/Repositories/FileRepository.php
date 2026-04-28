<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\File;
use App\Domain\Enums\FileStatusEnum;
use App\Domain\Repositories\FileRepositoryInterface;
use App\Infrastructure\Helpers\LoggedUserHelper;
use DateTimeImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FileRepository implements FileRepositoryInterface
{
    private const COLUMNS = [
        'id', 'name', 'template_id', 'user_id', 'payload',
        'path', 'storage_disk', 'file_size', 'organization_id', 'expires_at',
        'ready_to_download', 'status', 'errors', 'created_at', 'updated_at',
    ];

    public function exists(array $filters): bool
    {
        return $this->baseQuery($filters)
            ->where('user_id', app(LoggedUserHelper::class)->userId())
            ->exists();
    }

    public function findAllUsingFilters(array $filters = []): Collection
    {
        $rows = $this->baseQuery($filters)->get();
        return collect($rows->map(fn($r) => $this->mapRow($r))->all());
    }

    public function findFirstUsingFilters(array $filters = []): ?File
    {
        $row = $this->baseQuery($filters)->first();
        return $row ? $this->mapRow($row) : null;
    }

    public function findOneById(string $id): ?File
    {
        $row = DB::table('files')->select(self::COLUMNS)->where('id', $id)->first();
        return $row ? $this->mapRow($row) : null;
    }

    public function findExpired(): Collection
    {
        $rows = DB::table('files')
            ->select(self::COLUMNS)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->get();

        return collect($rows->map(fn($r) => $this->mapRow($r))->all());
    }

    public function insert(File $file): string
    {
        DB::table('files')->insert([
            'id'              => $file->id,
            'name'            => $file->name,
            'template_id'     => $file->templateId,
            'user_id'         => $file->userId,
            'payload'         => $file->payload,
            'path'            => $file->path,
            'storage_disk'    => $file->storageDisk,
            'file_size'       => $file->fileSize,
            'organization_id' => $file->organizationId,
            'expires_at'      => $file->expiresAt,
            'ready_to_download' => (bool) $file->readyToDownload,
            'status'          => $file->status->value,
            'errors'          => $file->errors,
            'created_at'      => $file->createdAt,
            'updated_at'      => $file->updatedAt,
        ]);

        return $file->id;
    }

    public function update(File $file): bool
    {
        return (bool) DB::table('files')->where('id', $file->id)->update([
            'name'            => $file->name,
            'payload'         => $file->payload,
            'path'            => $file->path,
            'storage_disk'    => $file->storageDisk,
            'file_size'       => $file->fileSize,
            'ready_to_download' => (bool) $file->readyToDownload,
            'status'          => $file->status->value,
            'errors'          => $file->errors,
            'updated_at'      => now(),
        ]);
    }

    public function delete(string $id): bool
    {
        return (bool) DB::table('files')->where('id', $id)->delete();
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function baseQuery(array $filters): Builder
    {
        return DB::table('files')
            ->select(self::COLUMNS)
            ->when(!empty($filters['id']),              fn(Builder $q) => $q->where('id', $filters['id']))
            ->when(!empty($filters['name']),            fn(Builder $q) => $q->where('name', $filters['name']))
            ->when(!empty($filters['templateId']),      fn(Builder $q) => $q->where('template_id', $filters['templateId']))
            ->when(!empty($filters['organizationId']),  fn(Builder $q) => $q->where('organization_id', $filters['organizationId']))
            ->when(!empty($filters['path']),            fn(Builder $q) => $q->where('path', $filters['path']))
            ->when(isset($filters['readyToDownload']),  fn(Builder $q) => $q->where('ready_to_download', (bool) $filters['readyToDownload']))
            ->when(!empty($filters['status']),          fn(Builder $q) => $q->where('status', $filters['status']))
            ->when(isset($filters['errors']) && $filters['errors'] === null,
                                                        fn(Builder $q) => $q->whereNull('errors'));
    }

    private function mapRow(object $row): File
    {
        return File::restore(
            id:             $row->id,
            name:           $row->name,
            templateId:     $row->template_id,
            userId:         $row->user_id,
            payload:        $row->payload,
            path:           $row->path,
            storageDisk:    $row->storage_disk ?? 'local',
            fileSize:       isset($row->file_size) ? (int) $row->file_size : null,
            organizationId: $row->organization_id ?? null,
            expiresAt:      $row->expires_at ?? null,
            readyToDownload: (bool) $row->ready_to_download,
            status:         FileStatusEnum::from($row->status),
            errors:         $row->errors,
            createdAt:      new DateTimeImmutable($row->created_at),
            updatedAt:      new DateTimeImmutable($row->updated_at),
        );
    }
}
