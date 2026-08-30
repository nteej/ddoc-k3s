<?php

namespace App\Filament\Resources\LandingSectionResource\Pages;

use App\Filament\Resources\LandingSectionResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListLandingSections extends ListRecords
{
    protected static string $resource = LandingSectionResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }
}
