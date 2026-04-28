<?php

declare(strict_types=1);

namespace App\Domain\Services;

use Illuminate\Support\Facades\Storage;
use Exception;

class FileStorageService
{
    private string $disk;
    private string $tmpPath;

    public function __construct()
    {
        $this->disk    = config('filesystems.default', 'local');
        $this->tmpPath = storage_path('app/public/tmp');
    }

    public function activeDisk(): string
    {
        return $this->disk;
    }

    public function upload(string $fileName, ?string $storagePath = null): string
    {
        $localFile   = $this->tmpPath . DIRECTORY_SEPARATOR . $fileName;
        $storagePath = $storagePath ?? 'documents/' . $fileName;

        if (!file_exists($localFile)) {
            throw new Exception("Temp file not found: {$localFile}");
        }

        try {
            Storage::disk($this->disk)->put($storagePath, file_get_contents($localFile));
            @unlink($localFile);
            return $storagePath;
        } catch (Exception $e) {
            logger()->error("Storage upload failed [{$this->disk}]: " . $e->getMessage());
            throw new Exception("Failed to upload file to storage");
        }
    }

    public function download(string $storagePath, string $disk): string
    {
        try {
            if (!Storage::disk($disk)->exists($storagePath)) {
                throw new Exception("File not found on disk [{$disk}]: {$storagePath}");
            }
            return Storage::disk($disk)->get($storagePath);
        } catch (Exception $e) {
            logger()->error("Storage download failed [{$disk}]: " . $e->getMessage());
            throw new Exception("Failed to download file from storage");
        }
    }

    public function delete(string $storagePath, string $disk): bool
    {
        try {
            if (!Storage::disk($disk)->exists($storagePath)) {
                return true; // already gone
            }
            return Storage::disk($disk)->delete($storagePath);
        } catch (Exception $e) {
            logger()->error("Storage delete failed [{$disk}]: " . $e->getMessage());
            return false;
        }
    }

    /** Returns a time-limited presigned URL for S3-compatible disks, or null for local. */
    public function temporaryUrl(string $storagePath, string $disk, int $minutes = 60): ?string
    {
        try {
            return Storage::disk($disk)->temporaryUrl($storagePath, now()->addMinutes($minutes));
        } catch (\Throwable) {
            return null; // local disk does not support presigned URLs
        }
    }

    public function fileSize(string $storagePath, string $disk): int
    {
        try {
            return Storage::disk($disk)->size($storagePath);
        } catch (\Throwable) {
            return 0;
        }
    }
}
