<?php

declare(strict_types=1);

namespace App\Application\Handlers;

use App\Application\DTOs\FindByFiltersFileInputDTO;
use App\Application\DTOs\FindByFiltersFileOutputDTO;
use App\Application\Services\ApiGatewayService;
use App\Domain\Entities\File;
use App\Domain\Repositories\FileRepositoryInterface;
use App\Infrastructure\Helpers\LoggedUserHelper;
use Carbon\Carbon;

final readonly class FindByFiltersFileHandler
{
    public function __construct(
        private FileRepositoryInterface $fileRepository,
    ) {
    }

    public function execute(FindByFiltersFileInputDTO $input): array
    {
        $files = $this->fileRepository->findAllUsingFilters($input->toArray());

        $outputDTO = [];

        foreach ($files as $file) {
            $apiGateway = new ApiGatewayService(
                host: config('app.host_internal_services.template'),
                verb: 'get',
                route: '/templates/filters',
                filters: ['id' => $file->templateId],
            );

            $templateData = $apiGateway->call();
            $templateName = $templateData->json()['data'][0]['name'] ?? null;

            $outputDTO[] = $this->createFileOutput($file, $templateName);
        }

        return $outputDTO;
    }

    private function createFileOutput(File $file, ?string $templateName): FindByFiltersFileOutputDTO
    {
        return new FindByFiltersFileOutputDTO(
            id: $file->id,
            templateId: $file->templateId,
            userId: app(LoggedUserHelper::class)->userId(),
            createdAt: Carbon::parse($file->createdAt)->format('Y-m-d h:i:s'),
            templateName: $templateName,
            status: $file->status->value,
            readyToDownload: $file->readyToDownload,
            errors: $file->errors,
        );
    }
}
