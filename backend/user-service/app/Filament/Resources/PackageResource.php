<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PackageResource\Pages;
use App\Models\Package;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Columns\BooleanColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class PackageResource extends Resource
{
    protected static ?string $model = Package::class;

    protected static ?string $navigationIcon = 'heroicon-o-cube';

    protected static ?string $navigationGroup = 'Billing';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),

                TextInput::make('slug')
                    ->required()
                    ->maxLength(255),

                Textarea::make('description')
                    ->nullable()
                    ->rows(3),

                TextInput::make('price_monthly')
                    ->numeric()
                    ->required(),

                TextInput::make('price_yearly')
                    ->numeric()
                    ->required(),

                TextInput::make('max_api_keys')
                    ->numeric()
                    ->required(),

                TextInput::make('max_members')
                    ->numeric()
                    ->required(),

                TextInput::make('max_monthly_generations')
                    ->numeric()
                    ->required(),

                TextInput::make('max_file_storage_mb')
                    ->numeric()
                    ->label('Max File Storage (MB)')
                    ->required(),

                Toggle::make('is_active')
                    ->label('Active'),

                TextInput::make('sort_order')
                    ->numeric()
                    ->required(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('slug'),

                TextColumn::make('price_monthly')
                    ->money('EUR')
                    ->sortable(),

                TextColumn::make('price_yearly')
                    ->money('EUR')
                    ->sortable(),

                TextColumn::make('max_members')
                    ->label('Max Members'),

                TextColumn::make('max_monthly_generations')
                    ->label('Max Generations'),

                BooleanColumn::make('is_active')
                    ->label('Active'),

                TextColumn::make('sort_order')
                    ->sortable(),
            ])
            ->actions([
                EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListPackages::route('/'),
            'create' => Pages\CreatePackage::route('/create'),
            'edit'   => Pages\EditPackage::route('/{record}/edit'),
        ];
    }
}
