<?php

namespace App\Providers\Filament;

use App\Filament\Pages\KlarnaSettings;
use App\Filament\Resources\ApiKeyResource;
use App\Filament\Resources\AuditLogResource;
use App\Filament\Resources\FileResource;
use App\Filament\Resources\NotificationResource;
use App\Filament\Resources\OrganizationResource;
use App\Filament\Resources\PackageResource;
use App\Filament\Resources\PackageUpgradeRequestResource;
use App\Filament\Resources\LandingSectionResource;
use App\Filament\Resources\LandingTemplateResource;
use App\Filament\Resources\TemplateResource;
use App\Filament\Resources\UserResource;
use App\Filament\Resources\WebhookResource;
use App\Filament\Widgets\FilesGeneratedChartWidget;
use App\Filament\Widgets\StatsOverviewWidget;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('/admin')
            ->login()
            ->brandName('DDoc Admin')
            ->favicon('/favicon.ico')
            ->colors([
                'primary' => Color::Indigo,
            ])
            ->resources([
                UserResource::class,
                OrganizationResource::class,
                PackageResource::class,
                PackageUpgradeRequestResource::class,
                ApiKeyResource::class,
                WebhookResource::class,
                NotificationResource::class,
                AuditLogResource::class,
                TemplateResource::class,
                FileResource::class,
                LandingTemplateResource::class,
                LandingSectionResource::class,
            ])
            ->pages([
                KlarnaSettings::class,
            ])
            ->widgets([
                StatsOverviewWidget::class,
                FilesGeneratedChartWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
