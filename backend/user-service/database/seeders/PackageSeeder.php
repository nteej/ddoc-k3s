<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PackageSeeder extends Seeder
{
    public function run(): void
    {
        $packages = [
            [
                'id'                      => Str::orderedUuid()->toString(),
                'name'                    => 'Free',
                'slug'                    => 'free',
                'description'             => 'Get started with DynaDoc at no cost.',
                'price_monthly'           => 0,
                'price_yearly'            => 0,
                'max_api_keys'            => 1,
                'max_members'             => 5,
                'max_monthly_generations' => 50,
                'max_file_storage_mb'     => 500,
                'features'                => json_encode(['PDF generation', 'Basic templates', '1 API key']),
                'is_active'               => true,
                'sort_order'              => 1,
            ],
            [
                'id'                      => Str::orderedUuid()->toString(),
                'name'                    => 'Pro',
                'slug'                    => 'pro',
                'description'             => 'Everything you need for growing teams.',
                'price_monthly'           => 29,
                'price_yearly'            => 290,
                'max_api_keys'            => 5,
                'max_members'             => 20,
                'max_monthly_generations' => 500,
                'max_file_storage_mb'     => 5120,
                'features'                => json_encode([
                    'Everything in Free',
                    '5 API keys',
                    'Up to 20 members',
                    '500 monthly generations',
                    'Priority support',
                ]),
                'is_active'               => true,
                'sort_order'              => 2,
            ],
            [
                'id'                      => Str::orderedUuid()->toString(),
                'name'                    => 'Enterprise',
                'slug'                    => 'enterprise',
                'description'             => 'Unlimited power for large organizations.',
                'price_monthly'           => 99,
                'price_yearly'            => 990,
                'max_api_keys'            => -1,
                'max_members'             => -1,
                'max_monthly_generations' => -1,
                'max_file_storage_mb'     => -1,
                'features'                => json_encode([
                    'Everything in Pro',
                    'Unlimited API keys',
                    'Unlimited members',
                    'Unlimited generations',
                    'Dedicated support',
                    'Custom integrations',
                ]),
                'is_active'               => true,
                'sort_order'              => 3,
            ],
        ];

        foreach ($packages as $pkg) {
            DB::table('packages')->updateOrInsert(
                ['slug' => $pkg['slug']],
                array_merge($pkg, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }
}
