<?php

namespace App\Filament\Resources\LandingTemplateResource\Pages;

use App\Filament\Resources\LandingTemplateResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListLandingTemplates extends ListRecords
{
    protected static string $resource = LandingTemplateResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }
}
