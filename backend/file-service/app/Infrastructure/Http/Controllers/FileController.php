<?php

namespace App\Infrastructure\Http\Controllers;

use App\Application\Handlers\DestroyFileHandler;
use App\Application\Handlers\FindByFiltersFileHandler;
use App\Application\Handlers\GetDownloadHistoryHandler;
use App\Application\Handlers\GetEmailHistoryHandler;
use App\Application\Handlers\SendFileEmailHandler;
use App\Application\Handlers\StoreFileHandler;
use App\Application\DTOs\FindByFiltersFileInputDTO;
use App\Application\DTOs\StoreFileInputDTO;
use App\Application\Handlers\DownloadFileHandler;
use App\Infrastructure\Helpers\LoggedUserHelper;
use App\Infrastructure\Http\Requests\FindByFiltersFileRequest;
use App\Infrastructure\Http\Requests\SendEmailFileRequest;
use App\Infrastructure\Http\Requests\StoreFileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FileController extends BaseController
{
    public function __construct(private readonly LoggedUserHelper $loggedUser) {}

    public function findByFilters(FindByFiltersFileRequest $request, FindByFiltersFileHandler $handler): JsonResponse
    {
        $output = $handler->execute(new FindByFiltersFileInputDTO(
            id: $request->validated('id'),
            name: $request->validated('name'),
            templateId: $request->validated('templateId'),
            userId: $request->validated('userId'),
            path: $request->validated('path'),
            readyToDownload: $request->validated('readyToDownload'),
            status: $request->validated('status'),
            errors: null
        ));

        return $this->successResponse($output);
    }

    public function destroy(string $fileId, DestroyFileHandler $handler): JsonResponse
    {
        $result = $handler->execute(
            $fileId,
            $this->loggedUser->userId(),
            $this->loggedUser->role(),
        );
        return $this->successResponse($result);
    }

    public function download(string $id, DownloadFileHandler $handler, Request $request)
    {
        $file = $handler->execute(
            $id,
            $this->loggedUser->userId(),
            $request->ip(),
        );

        return response($file->content, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $file->name . '.pdf"',
        ]);
    }

    public function asyncGenerate(StoreFileRequest $request, StoreFileHandler $handler): JsonResponse
    {
        $output = $handler->execute(new StoreFileInputDTO(
            templateId: $request->validated('templateId'),
            name: $request->validated('name'),
            payload: $request->validated('payload')
        ));

        return $this->successResponse($output);
    }

    public function sendEmail(string $fileId, SendEmailFileRequest $request, SendFileEmailHandler $handler): JsonResponse
    {
        $handler->execute(
            $fileId,
            $request->validated('email'),
            $this->loggedUser->userId(),
            $request->validated('message'),
        );
        return $this->successResponse(['sent' => true]);
    }

    public function emailHistory(string $fileId, GetEmailHistoryHandler $handler): JsonResponse
    {
        $logs = $handler->execute($fileId);
        return $this->successResponse($logs->map(fn($l) => [
            'id'              => $l->id,
            'file_id'         => $l->fileId,
            'sent_by_user_id' => $l->sentByUserId,
            'recipient_email' => $l->recipientEmail,
            'message'         => $l->message,
            'status'          => $l->status,
            'error_message'   => $l->errorMessage,
            'sent_at'         => $l->sentAt->format('Y-m-d H:i:s'),
        ])->values());
    }

    public function downloadHistory(string $fileId, GetDownloadHistoryHandler $handler): JsonResponse
    {
        $logs = $handler->execute($fileId);
        return $this->successResponse($logs->map(fn($l) => [
            'id'                    => $l->id,
            'file_id'               => $l->fileId,
            'downloaded_by_user_id' => $l->downloadedByUserId,
            'ip_address'            => $l->ipAddress,
            'downloaded_at'         => $l->downloadedAt->format('Y-m-d H:i:s'),
        ])->values());
    }
}
