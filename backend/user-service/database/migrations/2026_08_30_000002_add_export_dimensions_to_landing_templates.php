<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('landing_templates', function (Blueprint $table) {
            $table->unsignedSmallInteger('export_width')->default(1080)->after('aspect_h');
            $table->unsignedSmallInteger('export_height')->default(1080)->after('export_width');
            $table->string('share_url_template', 400)->nullable()->after('export_height');
        });
    }

    public function down(): void
    {
        Schema::table('landing_templates', function (Blueprint $table) {
            $table->dropColumn(['export_width', 'export_height', 'share_url_template']);
        });
    }
};
