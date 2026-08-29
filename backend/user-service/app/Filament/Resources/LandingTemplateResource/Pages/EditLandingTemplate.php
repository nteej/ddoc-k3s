<?php

namespace App\Filament\Resources\LandingTemplateResource\Pages;

use App\Filament\Resources\LandingTemplateResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditLandingTemplate extends EditRecord
{
    protected static string $resource = LandingTemplateResource::class;

    protected function getHeaderActions(): array
    {
        return [DeleteAction::make()];
    }
}
