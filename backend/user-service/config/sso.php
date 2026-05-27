<?php

return [
    'client_id'    => env('PASSPORT_CLIENT_ID', ''),
    'client_secret' => env('PASSPORT_CLIENT_SECRET', ''),
    'redirect_uri'  => rtrim(env('FRONTEND_URL', 'https://ddoc.fi'), '/') . '/auth/callback',
    // Internal URL used server-side for the code→token exchange (bypasses Kong JWT check).
    // K8s: set to http://user-svc.dynadoc.svc.cluster.local:80/oauth/token
    // Local: set to http://localhost:8000/oauth/token or leave blank to fall back to APP_URL.
    'token_url' => env('PASSPORT_TOKEN_URL', env('APP_URL', 'http://localhost:8000') . '/oauth/token'),
];
