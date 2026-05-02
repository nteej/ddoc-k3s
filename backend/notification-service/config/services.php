<?php

return [
    'twilio' => [
        'sid'   => env('TWILIO_ACCOUNT_SID'),
        'token' => env('TWILIO_AUTH_TOKEN'),
        'from'  => env('TWILIO_FROM_NUMBER'),
    ],
    'pusher' => [
        'app_id'  => env('PUSHER_APP_ID'),
        'key'     => env('PUSHER_APP_KEY'),
        'secret'  => env('PUSHER_APP_SECRET'),
        'cluster' => env('PUSHER_APP_CLUSTER', 'eu'),
    ],
];
