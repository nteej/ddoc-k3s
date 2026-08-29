<?php

namespace App\Filament\Widgets;

use App\Models\GeneratedFile;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;

class FilesGeneratedChartWidget extends ChartWidget
{
    protected static ?string $heading = 'Files Generated (last 30 days)';

    protected string $type = 'line';

    protected function getData(): array
    {
        try {
            $data = GeneratedFile::query()
                ->selectRaw("DATE(created_at) as date, COUNT(*) as count")
                ->where('created_at', '>=', Carbon::now()->subDays(30)->startOfDay())
                ->groupByRaw("DATE(created_at)")
                ->orderByRaw("DATE(created_at) ASC")
                ->get();

            $labels = [];
            $counts = [];

            // Fill in all 30 days including zeros
            for ($i = 29; $i >= 0; $i--) {
                $date = Carbon::now()->subDays($i)->format('Y-m-d');
                $labels[] = Carbon::now()->subDays($i)->format('M d');
                $row = $data->firstWhere('date', $date);
                $counts[] = $row ? (int) $row->count : 0;
            }

            return [
                'datasets' => [
                    [
                        'label'           => 'Files Generated',
                        'data'            => $counts,
                        'borderColor'     => '#6366f1',
                        'backgroundColor' => 'rgba(99, 102, 241, 0.1)',
                        'fill'            => true,
                    ],
                ],
                'labels' => $labels,
            ];
        } catch (\Exception $e) {
            return [
                'datasets' => [
                    [
                        'label' => 'Files Generated',
                        'data'  => [],
                    ],
                ],
                'labels' => [],
            ];
        }
    }
}
