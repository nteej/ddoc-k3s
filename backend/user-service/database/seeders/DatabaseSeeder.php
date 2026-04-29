<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $userId = Str::orderedUuid()->toString();
        $companyId = Str::orderedUuid()->toString();
        $orgId = Str::orderedUuid()->toString();
        $now = now();

        if (DB::table('users')->where('email', 'admin@example.com')->exists()) {
            $this->command->info('Admin user already exists, skipping.');
            return;
        }

        DB::table('users')->insert([
            'id'                      => $userId,
            'name'                    => 'Admin',
            'email'                   => 'admin@example.com',
            'password'                => Hash::make('password'),
            'company_id'              => $companyId,
            'current_organization_id' => null,
            'provider'                => null,
            'provider_id'             => null,
            'photo_url'               => null,
            'created_at'              => $now,
            'updated_at'              => $now,
        ]);

        DB::table('organizations')->insert([
            'id'          => $orgId,
            'name'        => 'Default Organization',
            'slug'        => 'default-organization',
            'plan'        => 'free',
            'owner_id'    => $userId,
            'max_members' => 5,
            'created_at'  => $now,
            'updated_at'  => $now,
        ]);

        DB::table('organization_members')->insert([
            'id'              => Str::orderedUuid()->toString(),
            'organization_id' => $orgId,
            'user_id'         => $userId,
            'role'            => 'owner',
            'created_at'      => $now,
            'updated_at'      => $now,
        ]);

        DB::table('users')
            ->where('id', $userId)
            ->update(['current_organization_id' => $orgId]);
    }
}
