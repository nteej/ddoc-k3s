<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('klarna_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('mode', ['sandbox', 'production'])->default('sandbox');
            $table->string('sandbox_username')->nullable();
            $table->string('sandbox_password')->nullable();
            $table->string('production_username')->nullable();
            $table->string('production_password')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('klarna_settings');
    }
};
