<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // sessions.user_id defaults to bigint in Laravel's schema but our users use UUIDs
        DB::statement('ALTER TABLE sessions ALTER COLUMN user_id TYPE varchar(36) USING user_id::varchar');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE sessions ALTER COLUMN user_id TYPE bigint USING NULL');
    }
};
