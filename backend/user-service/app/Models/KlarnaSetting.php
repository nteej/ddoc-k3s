<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class KlarnaSetting extends Model
{
    use HasUuids;

    protected $table = 'klarna_settings';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'mode',
        'sandbox_username',
        'sandbox_password',
        'production_username',
        'production_password',
    ];

    protected $hidden = [
        'sandbox_password',
        'production_password',
    ];
}
