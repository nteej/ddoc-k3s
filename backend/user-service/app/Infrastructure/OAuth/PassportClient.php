<?php

declare(strict_types=1);

namespace App\Infrastructure\OAuth;

use Laravel\Passport\Client;

class PassportClient extends Client
{
    // Skip the authorization approval screen for all first-party clients.
    // This is the DynaDoc frontend — users log in to DynaDoc, not to a third party.
    public function skipsAuthorization(): bool
    {
        return true;
    }
}
