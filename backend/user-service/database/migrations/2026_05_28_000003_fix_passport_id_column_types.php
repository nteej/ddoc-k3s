<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Passport generates hex string IDs (not UUIDs) for tokens and auth codes.
        // The original migration incorrectly used uuid() type for these columns.
        DB::statement('ALTER TABLE oauth_auth_codes ALTER COLUMN id TYPE varchar(100)');
        DB::statement('ALTER TABLE oauth_access_tokens ALTER COLUMN id TYPE varchar(100)');
        DB::statement('ALTER TABLE oauth_refresh_tokens ALTER COLUMN id TYPE varchar(100)');
        // access_token_id in refresh_tokens references oauth_access_tokens.id
        DB::statement('ALTER TABLE oauth_refresh_tokens ALTER COLUMN access_token_id TYPE varchar(100)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE oauth_auth_codes ALTER COLUMN id TYPE uuid USING id::uuid');
        DB::statement('ALTER TABLE oauth_access_tokens ALTER COLUMN id TYPE uuid USING id::uuid');
        DB::statement('ALTER TABLE oauth_refresh_tokens ALTER COLUMN id TYPE uuid USING id::uuid');
        DB::statement('ALTER TABLE oauth_refresh_tokens ALTER COLUMN access_token_id TYPE uuid USING access_token_id::uuid');
    }
};
