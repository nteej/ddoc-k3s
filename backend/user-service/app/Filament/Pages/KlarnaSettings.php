<?php

namespace App\Filament\Pages;

use App\Models\KlarnaSetting;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class KlarnaSettings extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-credit-card';

    protected static ?string $navigationGroup = 'Billing';

    protected static string $view = 'filament.pages.klarna-settings';

    protected static ?string $title = 'Klarna Settings';

    public ?array $data = [];

    public function mount(): void
    {
        $settings = KlarnaSetting::first();

        $this->form->fill($settings ? $settings->toArray() : []);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Select::make('mode')
                    ->options([
                        'sandbox'    => 'Sandbox',
                        'production' => 'Production',
                    ])
                    ->required()
                    ->default('sandbox'),

                TextInput::make('sandbox_username')
                    ->label('Sandbox Username')
                    ->nullable(),

                TextInput::make('sandbox_password')
                    ->label('Sandbox Password')
                    ->password()
                    ->nullable(),

                TextInput::make('production_username')
                    ->label('Production Username')
                    ->nullable(),

                TextInput::make('production_password')
                    ->label('Production Password')
                    ->password()
                    ->nullable(),
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $data = $this->form->getState();

        $settings = KlarnaSetting::first();

        if ($settings) {
            $settings->update($data);
        } else {
            KlarnaSetting::create($data);
        }

        Notification::make()
            ->title('Klarna settings saved successfully.')
            ->success()
            ->send();
    }

    protected function getFormActions(): array
    {
        return [];
    }
}
