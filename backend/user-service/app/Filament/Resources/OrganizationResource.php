<?php

namespace App\Filament\Resources;

use App\Filament\Resources\OrganizationResource\Pages;
use App\Models\Organization;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class OrganizationResource extends Resource
{
    protected static ?string $model = Organization::class;

    protected static ?string $navigationIcon = 'heroicon-o-building-office';

    protected static ?string $navigationGroup = 'Users & Orgs';

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

                Select::make('plan')
                    ->options([
                        'free'       => 'Free',
                        'pro'        => 'Pro',
                        'enterprise' => 'Enterprise',
                    ])
                    ->required(),

                TextInput::make('max_members')
                    ->numeric()
                    ->required(),

                TextInput::make('monthly_generation_count')
                    ->numeric()
                    ->disabled(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('slug')
                    ->searchable(),

                BadgeColumn::make('plan')
                    ->colors([
                        'secondary' => 'free',
                        'primary'   => 'pro',
                        'warning'   => 'enterprise',
                    ]),

                TextColumn::make('owner_id')
                    ->label('Owner ID')
                    ->limit(8),

                TextColumn::make('monthly_generation_count')
                    ->label('Generations'),

                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([
                ViewAction::make(),
                EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListOrganizations::route('/'),
            'edit'  => Pages\EditOrganization::route('/{record}/edit'),
            'view'  => Pages\ViewOrganization::route('/{record}'),
        ];
    }
}
