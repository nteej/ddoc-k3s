<?php

return [
    'default'  => env('MAIL_MAILER', 'smtp'),
    'mailers'  => [
        'smtp' => [
            'transport'  => 'smtp',
            'host'       => env('MAIL_HOST', 'ssl0.ovh.net'),
            'port'       => env('MAIL_PORT', 465),
            'scheme'     => env('MAIL_SCHEME', 'smtps'),
            'username'   => env('MAIL_USERNAME'),
            'password'   => env('MAIL_PASSWORD'),
            'timeout'    => null,
        ],
        'log' => [
            'transport' => 'log',
            'channel'   => env('MAIL_LOG_CHANNEL'),
        ],
    ],
    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'admin@ddoc.fi'),
        'name'    => env('MAIL_FROM_NAME', 'DynaDoc'),
    ],
];
