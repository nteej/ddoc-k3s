<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookDelivery extends Model
{
    use HasUuids;

    protected $table = 'webhook_deliveries';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'webhook_id',
        'event',
        'payload',
        'status',
        'response_code',
        'attempts',
        'next_retry_at',
    ];

    protected function casts(): array
    {
        return [
            'payload'       => 'json',
            'attempts'      => 'integer',
            'response_code' => 'integer',
            'next_retry_at' => 'datetime',
        ];
    }

    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class);
    }
}
