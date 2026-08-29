<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LandingTemplateResource\Pages;
use App\Models\LandingTemplate;
use Filament\Forms\Components\ColorPicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteAction;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Columns\ColorColumn;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class LandingTemplateResource extends Resource
{
    protected static ?string $model = LandingTemplate::class;

    protected static ?string $navigationIcon = 'heroicon-o-photo';

    protected static ?string $navigationGroup = 'Content';

    protected static ?string $navigationLabel = 'Card Templates';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Section::make('Template Identity')
                ->columns(2)
                ->schema([
                    TextInput::make('name')
                        ->required()
                        ->maxLength(100),

                    TextInput::make('platform')
                        ->required()
                        ->maxLength(50)
                        ->placeholder('Instagram, Twitter / X, LinkedIn…'),

                    ColorPicker::make('platform_color')
                        ->label('Platform Badge Colour')
                        ->required(),

                    TextInput::make('description')
                        ->required()
                        ->maxLength(200)
                        ->columnSpanFull(),
                ]),

            Section::make('Layout')
                ->columns(3)
                ->schema([
                    TextInput::make('aspect_w')
                        ->label('Aspect Width')
                        ->numeric()
                        ->required()
                        ->step(0.01)
                        ->minValue(0.1),

                    TextInput::make('aspect_h')
                        ->label('Aspect Height')
                        ->numeric()
                        ->required()
                        ->step(0.01)
                        ->minValue(0.1),

                    Select::make('layout')
                        ->required()
                        ->options([
                            'centered' => 'Centered',
                            'bottom'   => 'Bottom (LinkedIn style)',
                            'quote'    => 'Quote',
                        ]),

                    TextInput::make('sort_order')
                        ->label('Sort Order')
                        ->integer()
                        ->default(0)
                        ->minValue(0),

                    Toggle::make('is_active')
                        ->label('Active')
                        ->default(true)
                        ->columnSpan(2),
                ]),

            Section::make('Default Content')
                ->description('Pre-filled content shown when a user picks this template')
                ->columns(2)
                ->schema([
                    TextInput::make('headline')
                        ->required()
                        ->maxLength(200)
                        ->columnSpanFull(),

                    Textarea::make('subtext')
                        ->required()
                        ->rows(3)
                        ->maxLength(500)
                        ->columnSpanFull(),

                    TextInput::make('cta')
                        ->label('CTA Button Text')
                        ->required()
                        ->maxLength(60),

                    TextInput::make('brand_name')
                        ->label('Brand / Handle')
                        ->required()
                        ->maxLength(60),

                    Toggle::make('show_cta')
                        ->label('Show CTA')
                        ->default(true),

                    Toggle::make('show_brand')
                        ->label('Show Brand')
                        ->default(true),
                ]),

            Section::make('Default Colours & Typography')
                ->columns(3)
                ->schema([
                    ColorPicker::make('bg_color')
                        ->label('Background Colour')
                        ->required(),

                    ColorPicker::make('bg_color2')
                        ->label('Background Gradient End')
                        ->required(),

                    Toggle::make('use_gradient')
                        ->label('Use Gradient')
                        ->default(false),

                    ColorPicker::make('text_color')
                        ->label('Text Colour')
                        ->required(),

                    ColorPicker::make('accent_color')
                        ->label('Accent Colour')
                        ->required(),

                    Select::make('font')
                        ->required()
                        ->options([
                            'sans'  => 'Sans-serif',
                            'serif' => 'Serif',
                            'mono'  => 'Monospace',
                        ])
                        ->default('sans'),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('sort_order')
            ->columns([
                TextColumn::make('sort_order')
                    ->label('#')
                    ->sortable()
                    ->width(50),

                TextColumn::make('name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                TextColumn::make('platform')
                    ->badge()
                    ->color(fn($record) => 'gray'),

                ColorColumn::make('platform_color')
                    ->label('Badge'),

                TextColumn::make('layout')
                    ->badge()
                    ->color(fn($state) => match($state) {
                        'centered' => 'info',
                        'bottom'   => 'warning',
                        'quote'    => 'success',
                        default    => 'gray',
                    }),

                TextColumn::make('aspect_w')
                    ->label('Ratio')
                    ->formatStateUsing(fn($record) => $record->aspect_w . ':' . $record->aspect_h),

                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),

                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                TernaryFilter::make('is_active')->label('Active'),
            ])
            ->actions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->reorderable('sort_order');
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListLandingTemplates::route('/'),
            'create' => Pages\CreateLandingTemplate::route('/create'),
            'edit'   => Pages\EditLandingTemplate::route('/{record}/edit'),
        ];
    }
}
