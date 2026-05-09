<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\FileDownloadLog;
use App\Domain\Repositories\FileDownloadLogRepositoryInterface;
use DateTimeImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FileDownloadLogRepository implements FileDownloadLogRepositoryInterface
{
    public function insert(FileDownloadLog $log): void
    {
        DB::table('file_download_logs')->insert([
            'id'                   => $log->id,
            'file_id'              => $log->fileId,
            'downloaded_by_user_id' => $log->downloadedByUserId,
            'ip_address'           => $log->ipAddress,
            'downloaded_at'        => $log->downloadedAt->format('Y-m-d H:i:s'),
        ]);
    }

    public function listForFile(string $fileId): Collection
    {
        $rows = DB::table('file_download_logs')
            ->where('file_id', $fileId)
            ->orderBy('downloaded_at', 'desc')
            ->get();

        return $rows->map(fn($r) => new FileDownloadLog(
            id:                 $r->id,
            fileId:             $r->file_id,
            downloadedByUserId: $r->downloaded_by_user_id,
            ipAddress:          $r->ip_address,
            downloadedAt:       new DateTimeImmutable($r->downloaded_at),
        ));
    }
}
