<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\FileEmailLog;
use App\Domain\Repositories\FileEmailLogRepositoryInterface;
use DateTimeImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FileEmailLogRepository implements FileEmailLogRepositoryInterface
{
    public function insert(FileEmailLog $log): void
    {
        DB::table('file_email_logs')->insert([
            'id'              => $log->id,
            'file_id'         => $log->fileId,
            'sent_by_user_id' => $log->sentByUserId,
            'recipient_email' => $log->recipientEmail,
            'message'         => $log->message,
            'status'          => $log->status,
            'error_message'   => $log->errorMessage,
            'sent_at'         => $log->sentAt->format('Y-m-d H:i:s'),
        ]);
    }

    public function listForFile(string $fileId): Collection
    {
        $rows = DB::table('file_email_logs')
            ->where('file_id', $fileId)
            ->orderBy('sent_at', 'desc')
            ->get();

        return $rows->map(fn($r) => new FileEmailLog(
            id:             $r->id,
            fileId:         $r->file_id,
            sentByUserId:   $r->sent_by_user_id,
            recipientEmail: $r->recipient_email,
            message:        $r->message,
            status:         $r->status,
            errorMessage:   $r->error_message,
            sentAt:         new DateTimeImmutable($r->sent_at),
        ));
    }

    public function countForFile(string $fileId): int
    {
        return DB::table('file_email_logs')
            ->where('file_id', $fileId)
            ->where('status', 'sent')
            ->count();
    }
}
