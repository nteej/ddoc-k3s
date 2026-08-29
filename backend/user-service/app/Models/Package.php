<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    use HasUuids;

    protected $table = 'packages';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'slug',
        'description',
        'price_monthly',
        'price_yearly',
        'max_api_keys',
        'max_members',
        'max_monthly_generations',
        'max_file_storage_mb',
        'features',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_monthly'           => 'decimal:2',
            'price_yearly'            => 'decimal:2',
            'max_api_keys'            => 'integer',
            'max_members'             => 'integer',
            'max_monthly_generations' => 'integer',
            'max_file_storage_mb'     => 'integer',
            'features'                => 'json',
            'is_active'               => 'boolean',
            'sort_order'              => 'integer',
        ];
    }
}
