<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->string('storage_disk', 20)->default('local')->after('path');
            $table->bigInteger('file_size')->nullable()->after('storage_disk');
            $table->uuid('organization_id')->nullable()->after('file_size');
            $table->timestamp('expires_at')->nullable()->after('organization_id');
        });
    }

    public function down(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->dropColumn(['storage_disk', 'file_size', 'organization_id', 'expires_at']);
        });
    }
};
