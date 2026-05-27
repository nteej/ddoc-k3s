<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PassportClientSeeder extends Seeder
{
    private const CLIENT_NAME = 'DynaDoc Frontend';

    public function run(): void
    {
        if (DB::table('oauth_clients')->where('name', self::CLIENT_NAME)->exists()) {
            $this->command->info('Passport client "' . self::CLIENT_NAME . '" already exists, skipping.');
            return;
        }

        $clientId = (string) Str::uuid();
        $secret   = Str::random(40);
        $redirect = rtrim(env('FRONTEND_URL', 'https://ddoc.fi'), '/') . '/auth/callback';

        DB::table('oauth_clients')->insert([
            'id'                     => $clientId,
            'name'                   => self::CLIENT_NAME,
            'secret'                 => $secret,
            'redirect'               => $redirect,
            'personal_access_client' => false,
            'password_client'        => false,
            'revoked'                => false,
            'created_at'             => now(),
            'updated_at'             => now(),
        ]);

        $this->command->info('');
        $this->command->info('=== Passport OAuth2 Client Created ===');
        $this->command->info('Name:          ' . self::CLIENT_NAME);
        $this->command->info('Client ID:     ' . $clientId);
        $this->command->info('Client Secret: ' . $secret);
        $this->command->info('Redirect URI:  ' . $redirect);
        $this->command->info('');
        $this->command->warn('Store these in your K8s secrets as PASSPORT_CLIENT_ID and PASSPORT_CLIENT_SECRET.');
        $this->command->info('');
    }
}
