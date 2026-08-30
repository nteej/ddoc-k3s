<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LandingSectionResource\Pages;
use App\Models\LandingSection;
use Filament\Forms\Components\KeyValue;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Tabs;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteAction;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class LandingSectionResource extends Resource
{
    protected static ?string $model = LandingSection::class;

    protected static ?string $navigationIcon = 'heroicon-o-view-columns';

    protected static ?string $navigationGroup = 'Content';

    protected static ?string $navigationLabel = 'Landing Sections';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Select::make('type')
                ->required()
                ->options([
                    'hero'         => 'Hero',
                    'features'     => 'Features',
                    'how_it_works' => 'How It Works',
                    'cta_banner'   => 'CTA Banner',
                    'wizard'       => 'Wizard',
                ])
                ->default('hero'),

            TextInput::make('sort_order')
                ->label('Sort Order')
                ->integer()
                ->default(0)
                ->minValue(0),

            Toggle::make('is_active')
                ->label('Active')
                ->default(true),

            Tabs::make('Content')
                ->columnSpanFull()
                ->tabs([
                    Tabs\Tab::make('English')
                        ->schema([
                            TextInput::make('heading_en')
                                ->label('Heading')
                                ->maxLength(500),

                            Textarea::make('subheading_en')
                                ->label('Subheading')
                                ->rows(3),

                            Repeater::make('items_en')
                                ->label('Items')
                                ->schema([
                                    TextInput::make('title')
                                        ->required()
                                        ->maxLength(200),

                                    Textarea::make('description')
                                        ->required()
                                        ->rows(2),

                                    TextInput::make('icon')
                                        ->label('Icon (optional)')
                                        ->maxLength(100),
                                ])
                                ->collapsible()
                                ->reorderable()
                                ->addActionLabel('Add Item'),
                        ]),

                    Tabs\Tab::make('Finnish')
                        ->schema([
                            TextInput::make('heading_fi')
                                ->label('Heading')
                                ->maxLength(500),

                            Textarea::make('subheading_fi')
                                ->label('Subheading')
                                ->rows(3),

                            Repeater::make('items_fi')
                                ->label('Items')
                                ->schema([
                                    TextInput::make('title')
                                        ->required()
                                        ->maxLength(200),

                                    Textarea::make('description')
                                        ->required()
                                        ->rows(2),

                                    TextInput::make('icon')
                                        ->label('Icon (optional)')
                                        ->maxLength(100),
                                ])
                                ->collapsible()
                                ->reorderable()
                                ->addActionLabel('Add Item'),
                        ]),

                    Tabs\Tab::make('Swedish')
                        ->schema([
                            TextInput::make('heading_sv')
                                ->label('Heading')
                                ->maxLength(500),

                            Textarea::make('subheading_sv')
                                ->label('Subheading')
                                ->rows(3),

                            Repeater::make('items_sv')
                                ->label('Items')
                                ->schema([
                                    TextInput::make('title')
                                        ->required()
                                        ->maxLength(200),

                                    Textarea::make('description')
                                        ->required()
                                        ->rows(2),

                                    TextInput::make('icon')
                                        ->label('Icon (optional)')
                                        ->maxLength(100),
                                ])
                                ->collapsible()
                                ->reorderable()
                                ->addActionLabel('Add Item'),
                        ]),

                    Tabs\Tab::make('Config')
                        ->schema([
                            KeyValue::make('config')
                                ->label('Non-translatable Config')
                                ->helperText('Key/value pairs for button labels, URLs, badge text, stats, etc.')
                                ->addActionLabel('Add entry')
                                ->reorderable(),
                        ]),
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

                TextColumn::make('type')
                    ->badge()
                    ->color(fn($state) => match($state) {
                        'hero'         => 'info',
                        'features'     => 'success',
                        'how_it_works' => 'warning',
                        'cta_banner'   => 'danger',
                        'wizard'       => 'primary',
                        default        => 'gray',
                    }),

                TextColumn::make('heading_en')
                    ->label('Heading (EN)')
                    ->limit(60)
                    ->searchable(),

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
            'index'  => Pages\ListLandingSections::route('/'),
            'create' => Pages\CreateLandingSection::route('/create'),
            'edit'   => Pages\EditLandingSection::route('/{record}/edit'),
        ];
    }
}
