<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->uuid('package_id')->nullable()->after('plan');
            $table->integer('monthly_generation_count')->default(0)->after('package_id');
            $table->timestamp('generation_reset_at')->nullable()->after('monthly_generation_count');

            $table->foreign('package_id')->references('id')->on('packages')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropForeign(['package_id']);
            $table->dropColumn(['package_id', 'monthly_generation_count', 'generation_reset_at']);
        });
    }
};
