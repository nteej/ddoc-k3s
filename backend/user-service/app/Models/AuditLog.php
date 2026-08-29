<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $connection = 'audit_db';
    protected $table = 'audit_logs';

    protected $primaryKey = 'id';
    protected $keyType = 'int';
    public $incrementing = true;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'user_id',
        'organization_id',
        'user_name',
        'action',
        'service',
        'status_code',
        'event_type',
        'occurred_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'status_code'  => 'integer',
            'occurred_at'  => 'datetime',
            'created_at'   => 'datetime',
        ];
    }
}
