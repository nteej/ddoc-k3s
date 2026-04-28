<?php

declare(strict_types=1);

namespace App\Application\Commands;

use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileStorageService;
use Illuminate\Console\Command;

class PurgeExpiredFilesCommand extends Command
{
    protected $signature   = 'files:purge-expired';
    protected $description = 'Delete files whose expires_at has passed from storage and database';

    public function __construct(
        private readonly FileRepositoryInterface $fileRepository,
        private readonly FileStorageService      $fileStorage,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $expired = $this->fileRepository->findExpired();

        if ($expired->isEmpty()) {
            $this->info('No expired files found.');
            return self::SUCCESS;
        }

        $deleted = 0;
        foreach ($expired as $file) {
            if ($file->path) {
                $this->fileStorage->delete($file->path, $file->storageDisk);
            }
            $this->fileRepository->delete($file->id);
            $deleted++;
        }

        $this->info("Purged {$deleted} expired file(s).");
        return self::SUCCESS;
    }
}
