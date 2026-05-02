<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use Illuminate\Routing\Controller;

abstract class BaseController extends Controller
{
    protected function successResponse(array $data = [], int $status = 200): \Illuminate\Http\JsonResponse
    {
        return response()->json(['message' => 'Success', 'data' => $data], $status);
    }

    protected function errorResponse(string $message, int $status = 400): \Illuminate\Http\JsonResponse
    {
        return response()->json(['message' => 'Error', 'error' => $message], $status);
    }
}
