<?php

namespace App\Filament\Widgets;

use App\Models\AuditLog;
use App\Models\GeneratedFile;
use App\Models\Organization;
use App\Models\PackageUpgradeRequest;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverviewWidget extends BaseWidget
{
    protected function getStats(): array
    {
        $filesGenerated = 0;
        try {
            $filesGenerated = GeneratedFile::count();
        } catch (\Exception $e) {
            // Connection to file_db unavailable
        }

        $auditEvents = 0;
        try {
            $auditEvents = AuditLog::count();
        } catch (\Exception $e) {
            // Connection to audit_db unavailable
        }

        return [
            Stat::make('Total Users', User::count())
                ->description('Registered users')
                ->color('primary'),

            Stat::make('Total Organisations', Organization::count())
                ->description('Active organisations')
                ->color('success'),

            Stat::make('Pending Upgrades', PackageUpgradeRequest::where('status', 'pending')->count())
                ->description('Awaiting approval')
                ->color('warning'),

            Stat::make('Files Generated', $filesGenerated)
                ->description('Total generated files')
                ->color('info'),

            Stat::make('Audit Events', $auditEvents)
                ->description('Total audit log entries')
                ->color('gray'),
        ];
    }
}
