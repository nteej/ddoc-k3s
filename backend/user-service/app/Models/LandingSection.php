<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LandingSection extends Model
{
    use HasUuids;

    protected $fillable = [
        'type',
        'sort_order',
        'is_active',
        'heading_en',
        'heading_fi',
        'heading_sv',
        'subheading_en',
        'subheading_fi',
        'subheading_sv',
        'items_en',
        'items_fi',
        'items_sv',
        'config',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
        'items_en'   => 'array',
        'items_fi'   => 'array',
        'items_sv'   => 'array',
        'config'     => 'array',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function toApiArray(string $locale = 'en'): array
    {
        $locale = in_array($locale, ['en', 'fi', 'sv']) ? $locale : 'en';

        return [
            'id'         => $this->id,
            'type'       => $this->type,
            'sortOrder'  => $this->sort_order,
            'isActive'   => (bool) $this->is_active,
            'heading'    => $this->{"heading_{$locale}"} ?? $this->heading_en,
            'subheading' => $this->{"subheading_{$locale}"} ?? $this->subheading_en,
            'items'      => $this->{"items_{$locale}"} ?? $this->items_en ?? [],
            'config'     => $this->config ?? [],
        ];
    }
}
