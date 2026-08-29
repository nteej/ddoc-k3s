<?php

namespace Database\Seeders;

use App\Models\LandingTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LandingTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Bold Gradient', 'platform' => 'Instagram', 'platform_color' => '#ec4899',
                'description' => '1:1 square with vibrant gradient background',
                'aspect_w' => 1, 'aspect_h' => 1, 'layout' => 'centered', 'sort_order' => 1, 'is_active' => true,
                'headline' => 'Make an Impact Today', 'subtext' => 'Share your story with the world and inspire others', 'cta' => 'Learn More',
                'bg_color' => '#7c3aed', 'bg_color2' => '#ec4899', 'use_gradient' => true, 'text_color' => '#ffffff',
                'accent_color' => '#fbbf24', 'font' => 'sans', 'brand_name' => 'YourBrand', 'show_cta' => true, 'show_brand' => true,
            ],
            [
                'name' => 'Minimal Clean', 'platform' => 'Instagram', 'platform_color' => '#ec4899',
                'description' => '1:1 square with light, elegant white design',
                'aspect_w' => 1, 'aspect_h' => 1, 'layout' => 'centered', 'sort_order' => 2, 'is_active' => true,
                'headline' => 'Less Is More', 'subtext' => 'Powerful ideas expressed simply and clearly to your audience', 'cta' => 'Read More',
                'bg_color' => '#f8fafc', 'bg_color2' => '#e2e8f0', 'use_gradient' => false, 'text_color' => '#1e293b',
                'accent_color' => '#6366f1', 'font' => 'sans', 'brand_name' => 'YourBrand', 'show_cta' => true, 'show_brand' => true,
            ],
            [
                'name' => 'Tweet Card', 'platform' => 'Twitter / X', 'platform_color' => '#0ea5e9',
                'description' => '16:9 wide card optimised for X / Twitter',
                'aspect_w' => 16, 'aspect_h' => 9, 'layout' => 'centered', 'sort_order' => 3, 'is_active' => true,
                'headline' => 'Big Thoughts Deserve Big Visibility', 'subtext' => 'Craft messages that resonate and get shared across the platform', 'cta' => 'Follow Us',
                'bg_color' => '#0f172a', 'bg_color2' => '#1e3a5f', 'use_gradient' => true, 'text_color' => '#f8fafc',
                'accent_color' => '#38bdf8', 'font' => 'sans', 'brand_name' => '@YourHandle', 'show_cta' => false, 'show_brand' => true,
            ],
            [
                'name' => 'Professional', 'platform' => 'LinkedIn', 'platform_color' => '#2563eb',
                'description' => '1.91:1 banner for LinkedIn posts',
                'aspect_w' => 1.91, 'aspect_h' => 1, 'layout' => 'bottom', 'sort_order' => 4, 'is_active' => true,
                'headline' => 'Thought Leadership Starts Here', 'subtext' => 'Connect, share insights, and grow your professional network with content that matters to your industry.', 'cta' => 'Connect Now',
                'bg_color' => '#1d4ed8', 'bg_color2' => '#1e3a8a', 'use_gradient' => true, 'text_color' => '#ffffff',
                'accent_color' => '#93c5fd', 'font' => 'sans', 'brand_name' => 'Your Company', 'show_cta' => true, 'show_brand' => true,
            ],
            [
                'name' => 'Vibrant Story', 'platform' => 'Instagram Story', 'platform_color' => '#f97316',
                'description' => '9:16 vertical story with bold colours',
                'aspect_w' => 9, 'aspect_h' => 16, 'layout' => 'centered', 'sort_order' => 5, 'is_active' => true,
                'headline' => 'Swipe Up!', 'subtext' => "Exclusive content just for you. Don't miss today's limited offer.", 'cta' => 'Tap Here',
                'bg_color' => '#f97316', 'bg_color2' => '#ef4444', 'use_gradient' => true, 'text_color' => '#ffffff',
                'accent_color' => '#fef08a', 'font' => 'sans', 'brand_name' => 'YourBrand', 'show_cta' => true, 'show_brand' => true,
            ],
            [
                'name' => 'Quote Card', 'platform' => 'All Platforms', 'platform_color' => '#475569',
                'description' => '1:1 dark inspirational quote design',
                'aspect_w' => 1, 'aspect_h' => 1, 'layout' => 'quote', 'sort_order' => 6, 'is_active' => true,
                'headline' => 'The best time to start was yesterday. The next best time is now.', 'subtext' => 'Share wisdom that moves people',
                'cta' => 'Share This', 'bg_color' => '#18181b', 'bg_color2' => '#27272a', 'use_gradient' => false, 'text_color' => '#fafafa',
                'accent_color' => '#a78bfa', 'font' => 'serif', 'brand_name' => '— Author Name', 'show_cta' => false, 'show_brand' => true,
            ],
        ];

        foreach ($templates as $data) {
            LandingTemplate::firstOrCreate(
                ['name' => $data['name'], 'platform' => $data['platform']],
                array_merge($data, ['id' => Str::uuid()])
            );
        }
    }
}
