<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSetupCommand extends Command
{
    protected $signature = 'admin:setup {email?} {--password= : Set a specific password}';

    protected $description = 'Grant system admin access to a user and optionally set their password';

    public function handle(): int
    {
        $email = $this->argument('email') ?? env('SYSTEM_ADMIN_EMAIL');

        if (! $email) {
            $this->error('No email provided and SYSTEM_ADMIN_EMAIL env var is not set.');

            return self::FAILURE;
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("No user found with email: {$email}");

            return self::FAILURE;
        }

        $password = $this->option('password');
        $generated = false;

        if (! $password) {
            $password = Str::random(16);
            $generated = true;
        }

        $user->update([
            'is_system_admin'   => true,
            'password'          => Hash::make($password),
            'password_set_at'   => now(),
        ]);

        $this->info("System admin access granted to: {$user->email}");

        if ($generated) {
            $this->warn("Generated password: {$password}");
            $this->warn('Please store this securely and change it after first login.');
        } else {
            $this->info('Password updated successfully.');
        }

        return self::SUCCESS;
    }
}
