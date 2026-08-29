<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FileResource\Pages;
use App\Models\GeneratedFile;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class FileResource extends Resource
{
    protected static ?string $model = GeneratedFile::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-arrow-down';

    protected static ?string $navigationGroup = 'Content';

    protected static ?string $label = 'Generated File';

    protected static ?string $pluralLabel = 'Generated Files';

    public static function form(Form $form): Form
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable(),

                TextColumn::make('user_id')
                    ->label('User ID')
                    ->limit(8),

                TextColumn::make('organization_id')
                    ->label('Org ID')
                    ->limit(8),

                BadgeColumn::make('status')
                    ->colors([
                        'success' => 'done',
                        'warning' => 'processing',
                        'danger'  => 'failed',
                    ]),

                TextColumn::make('file_size')
                    ->label('Size (bytes)')
                    ->sortable(),

                TextColumn::make('storage_disk'),

                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFiles::route('/'),
        ];
    }
}
