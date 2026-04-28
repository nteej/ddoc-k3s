<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\DTOs\FileContentInputDTO;
use App\Domain\Entities\File;
use App\Domain\Enums\FileStatusEnum;
use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileGenerationService;
use App\Domain\Services\FileStorageService;
use App\Domain\Services\FileTagsReplacementService;
use App\Domain\Services\FileTagsValidationService;
use App\Infrastructure\Kafka\Producers\KafkaProducer;
use Illuminate\Support\Facades\DB;
use Throwable;

final readonly class FileGenerationHandler
{
    public const TRANSACTION_ATTEMPTS = 3;

    public function __construct(
        private FileRepositoryInterface $fileRepository,
        private FileGenerationService   $fileGeneration,
        private FileStorageService      $fileStorage,
        private KafkaProducer           $kafka,
    ) {}

    public function execute(FileContentInputDTO $input): void
    {
        $files = $this->fileRepository->findAllUsingFilters([
            'templateId' => $input->template->id,
            'readyToDownload' => false,
            'errors' => null
        ]);

        foreach ($files as $file) {
            try {
                DB::transaction(function () use ($file, $input) {
                    $payloadArray = json_decode($file->payload, true);

                    $errorMessages = FileTagsValidationService::validate($input->sections, $payloadArray);
                    
                    if ($errorMessages) {
                        $this->setErrorFile($file, $errorMessages);
                        return;
                    }

                    $htmlContent = FileTagsReplacementService::replace($input->sections, $payloadArray);

                    $uniqidFileName = $this->fileGeneration->generate($input->template->name, $htmlContent);

                    $path = $this->fileStorage->upload($uniqidFileName);

                    $this->setSuccessFileUploaded($file, $path);
                }, self::TRANSACTION_ATTEMPTS);
            } catch (Throwable $e) {
                logger()->error("Erro ao processar arquivo {$file->id}: {$e->getMessage()}", [
                    'exception' => $e,
                    'file_id' => $file->id
                ]);

                continue;
            }
        }
    }

    private function setErrorFile(File $file, array $errorMessages): void
    {
        $this->updateFile($file, [
            'readyToDownload' => false,
            'status'          => FileStatusEnum::ERROR,
            'errors'          => json_encode($errorMessages),
        ]);

        $this->dispatchWebhookEvent('document.failed', $file, ['errors' => $errorMessages]);
        $this->dispatchNotification('document.failed', $file, [
            'title' => 'Document generation failed',
            'body'  => "Your document \"{$file->name}\" could not be generated.",
            'data'  => ['fileId' => $file->id, 'errors' => $errorMessages],
        ]);
    }

    private function setSuccessFileUploaded(File $file, string $path): void
    {
        $disk = $this->fileStorage->activeDisk();
        $this->updateFile($file, [
            'path'            => $path,
            'storageDisk'     => $disk,
            'fileSize'        => $this->fileStorage->fileSize($path, $disk),
            'readyToDownload' => true,
            'status'          => FileStatusEnum::READY,
        ]);

        $this->dispatchWebhookEvent('document.generated', $file);
        $this->dispatchNotification('document.generated', $file, [
            'title' => 'Document ready',
            'body'  => "Your document \"{$file->name}\" is ready to download.",
            'data'  => ['fileId' => $file->id, 'fileName' => $file->name],
        ]);
    }

    private function updateFile(File $file, array $attributes): void
    {
        $updatedFile = $file->update(...$attributes);
        $this->fileRepository->update($updatedFile);
    }

    private function dispatchWebhookEvent(string $event, File $file, array $extra = []): void
    {
        if (!$file->organizationId) return;

        try {
            $this->kafka->send('webhook.dispatch', array_merge([
                'event'           => $event,
                'organizationId'  => $file->organizationId,
                'fileId'          => $file->id,
                'fileName'        => $file->name,
                'templateId'      => $file->templateId,
                'timestamp'       => now()->toIso8601String(),
            ], $extra));
        } catch (\Throwable) {}
    }

    private function dispatchNotification(string $type, File $file, array $payload): void
    {
        if (!$file->organizationId) return;

        try {
            $this->kafka->send('notification.dispatch', array_merge([
                'type'           => $type,
                'organizationId' => $file->organizationId,
                'userId'         => $file->userId ?? null,
            ], $payload));
        } catch (\Throwable) {}
    }
}
