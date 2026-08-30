<?php

namespace App\Infrastructure\Http\Controllers;

use App\Models\LandingSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LandingSectionController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $locale = $request->query('locale', 'en');
        $locale = in_array($locale, ['en', 'fi', 'sv']) ? $locale : 'en';

        $sections = LandingSection::active()
            ->orderBy('sort_order')
            ->get()
            ->map(fn($s) => $s->toApiArray($locale));

        return response()->json($sections);
    }
}
