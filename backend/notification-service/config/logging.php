<?php

return [
    'default'  => env('LOG_CHANNEL', 'stderr'),
    'channels' => [
        'stderr' => [
            'driver'    => 'monolog',
            'handler'   => Monolog\Handler\StreamHandler::class,
            'formatter' => Monolog\Formatter\JsonFormatter::class,
            'with'      => ['stream' => 'php://stderr'],
            'level'     => env('LOG_LEVEL', 'warning'),
        ],
    ],
];
