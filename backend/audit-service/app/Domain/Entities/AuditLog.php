<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'id',
        'user_id',
        'user_name',
        'action',
        'service',
        'status_code',
        'event_type',
        'occurred_at',
        'created_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (AuditLog $model) {
            if (empty($model->id)) {
                $model->id = Str::orderedUuid()->toString();
            }
        });
    }
}
