<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class GeneratedFile extends Model
{
    use HasUuids;

    protected $connection = 'file_db';
    protected $table = 'files';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'template_id',
        'user_id',
        'payload',
        'path',
        'ready_to_download',
        'status',
        'errors',
        'storage_disk',
        'file_size',
        'organization_id',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'payload'           => 'json',
            'ready_to_download' => 'boolean',
            'file_size'         => 'integer',
            'expires_at'        => 'datetime',
        ];
    }
}
