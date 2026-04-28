<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\Events\TemplateRequestedEvent;
use App\Application\DTOs\StoreFileInputDTO;
use App\Domain\Entities\File;
use App\Domain\Repositories\FileRepositoryInterface;
use App\Domain\Services\FileStorageService;
use App\Infrastructure\Helpers\LoggedUserHelper;

final readonly class StoreFileHandler
{
    public function __construct(
        private FileRepositoryInterface $fileRepository,
        private FileStorageService      $fileStorage,
    ) {}

    public function execute(StoreFileInputDTO $input): string
    {
        $helper = app(LoggedUserHelper::class);

        $fileId = $this->fileRepository->insert(File::create(
            name:           $input->name,
            templateId:     $input->templateId,
            userId:         $helper->userId(),
            payload:        json_encode($input->payload),
            storageDisk:    $this->fileStorage->activeDisk(),
            organizationId: $helper->organizationId(),
        ));

        event(new TemplateRequestedEvent($input->templateId));

        return $fileId;
    }
}
