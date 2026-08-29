<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LandingTemplate extends Model
{
    use HasUuids;

    protected $fillable = [
        'name', 'platform', 'platform_color', 'description',
        'aspect_w', 'aspect_h', 'layout', 'sort_order', 'is_active',
        'headline', 'subtext', 'cta',
        'bg_color', 'bg_color2', 'use_gradient',
        'text_color', 'accent_color', 'font',
        'brand_name', 'show_cta', 'show_brand',
    ];

    protected $casts = [
        'aspect_w'     => 'float',
        'aspect_h'     => 'float',
        'is_active'    => 'boolean',
        'use_gradient' => 'boolean',
        'show_cta'     => 'boolean',
        'show_brand'   => 'boolean',
        'sort_order'   => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function toApiArray(): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'platform'      => $this->platform,
            'platformColor' => $this->platform_color,
            'description'   => $this->description,
            'aspectW'       => (float) $this->aspect_w,
            'aspectH'       => (float) $this->aspect_h,
            'layout'        => $this->layout,
            'defaults'      => [
                'headline'    => $this->headline,
                'subtext'     => $this->subtext,
                'cta'         => $this->cta,
                'bgColor'     => $this->bg_color,
                'bgColor2'    => $this->bg_color2,
                'useGradient' => (bool) $this->use_gradient,
                'textColor'   => $this->text_color,
                'accentColor' => $this->accent_color,
                'font'        => $this->font,
                'brandName'   => $this->brand_name,
                'showCta'     => (bool) $this->show_cta,
                'showBrand'   => (bool) $this->show_brand,
            ],
        ];
    }
}
