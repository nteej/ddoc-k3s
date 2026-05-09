<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->string('paper_format', 20)->default('A4')->after('description');
            $table->string('paper_orientation', 20)->default('portrait')->after('paper_format');
        });
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn(['paper_format', 'paper_orientation']);
        });
    }
};
