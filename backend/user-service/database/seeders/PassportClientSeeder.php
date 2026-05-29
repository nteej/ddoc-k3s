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
        $envId     = env('PASSPORT_CLIENT_ID', '');
        $envSecret = env('PASSPORT_CLIENT_SECRET', '');

        // If the env vars are set, ensure that specific client exists in the DB.
        // This makes the seeder idempotent: delete + restart will recreate the same client.
        if ($envId !== '' && $envSecret !== '') {
            if (DB::table('oauth_clients')->where('id', $envId)->exists()) {
                $this->command->info('Passport client already exists with the configured ID, skipping.');
                return;
            }

            $redirect = rtrim(env('FRONTEND_URL', 'https://ddoc.fi'), '/') . '/auth/callback';

            DB::table('oauth_clients')->insert([
                'id'                     => $envId,
                'name'                   => self::CLIENT_NAME,
                'secret'                 => $envSecret,
                'redirect'               => $redirect,
                'personal_access_client' => false,
                'password_client'        => false,
                'revoked'                => false,
                'created_at'             => now(),
                'updated_at'             => now(),
            ]);

            $this->command->info('Passport client created with credentials from PASSPORT_CLIENT_ID/SECRET env vars.');
            return;
        }

        // No env vars: fall back to generating random credentials (first-time bootstrap).
        // The generated values are printed here — copy them into your K8s passport-secret.
        if (DB::table('oauth_clients')->where('name', self::CLIENT_NAME)->exists()) {
            $existing = DB::table('oauth_clients')->where('name', self::CLIENT_NAME)->first();
            $this->command->warn('');
            $this->command->warn('=== Passport client already exists but PASSPORT_CLIENT_ID/SECRET env vars are NOT set! ===');
            $this->command->warn('Add these to your K8s passport-secret and user-app.yaml:');
            $this->command->warn('  PASSPORT_CLIENT_ID:     ' . $existing->id);
            $this->command->warn('  PASSPORT_CLIENT_SECRET: ' . $existing->secret);
            $this->command->warn('');
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
        $this->command->info('Client ID:     ' . $clientId);
        $this->command->info('Client Secret: ' . $secret);
        $this->command->info('Redirect URI:  ' . $redirect);
        $this->command->info('');
        $this->command->warn('ACTION REQUIRED: Add these to k8s/secrets/passport-secret.yaml and user-app.yaml,');
        $this->command->warn('then run: kubectl apply -f k8s/secrets/passport-secret.yaml');
        $this->command->warn('');
    }
}
