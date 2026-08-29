<?php

namespace App\Infrastructure\Http\Controllers;

use App\Models\LandingTemplate;
use Illuminate\Http\JsonResponse;

class LandingTemplateController extends BaseController
{
    public function index(): JsonResponse
    {
        $templates = LandingTemplate::active()
            ->orderBy('sort_order')
            ->get()
            ->map(fn($t) => $t->toApiArray());

        return response()->json($templates);
    }
}
