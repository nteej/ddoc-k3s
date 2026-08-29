<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PackageUpgradeRequestResource\Pages;
use App\Models\PackageUpgradeRequest;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\Action;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class PackageUpgradeRequestResource extends Resource
{
    protected static ?string $model = PackageUpgradeRequest::class;

    protected static ?string $navigationIcon = 'heroicon-o-arrow-trending-up';

    protected static ?string $navigationGroup = 'Billing';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('organization_id')
                    ->label('Organization')
                    ->limit(8),

                TextColumn::make('current_package_slug')
                    ->label('Current Package'),

                BadgeColumn::make('status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'approved',
                        'danger'  => 'rejected',
                    ]),

                TextColumn::make('payment_method')
                    ->label('Payment Method'),

                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([
                ViewAction::make(),

                Action::make('approve')
                    ->label('Approve')
                    ->color('success')
                    ->icon('heroicon-o-check-circle')
                    ->visible(fn (PackageUpgradeRequest $record) => $record->status === 'pending')
                    ->requiresConfirmation()
                    ->action(function (PackageUpgradeRequest $record) {
                        $record->update([
                            'status'              => 'approved',
                            'approved_at'         => now(),
                            'approved_by_user_id' => auth()->id(),
                        ]);
                    }),

                Action::make('reject')
                    ->label('Reject')
                    ->color('danger')
                    ->icon('heroicon-o-x-circle')
                    ->visible(fn (PackageUpgradeRequest $record) => $record->status === 'pending')
                    ->form([
                        Textarea::make('rejection_reason')
                            ->label('Rejection Reason')
                            ->required()
                            ->rows(3),
                    ])
                    ->action(function (PackageUpgradeRequest $record, array $data) {
                        $record->update([
                            'status'           => 'rejected',
                            'rejection_reason' => $data['rejection_reason'],
                        ]);
                    }),
            ]);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPackageUpgradeRequests::route('/'),
            'view'  => Pages\ViewPackageUpgradeRequest::route('/{record}'),
        ];
    }
}
