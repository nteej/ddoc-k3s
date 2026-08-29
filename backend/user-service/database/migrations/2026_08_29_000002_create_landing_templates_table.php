<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('platform');
            $table->string('platform_color', 30);
            $table->string('description');
            $table->decimal('aspect_w', 5, 2);
            $table->decimal('aspect_h', 5, 2);
            $table->enum('layout', ['centered', 'bottom', 'quote'])->default('centered');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            // Defaults
            $table->string('headline');
            $table->string('subtext');
            $table->string('cta');
            $table->string('bg_color', 20);
            $table->string('bg_color2', 20);
            $table->boolean('use_gradient')->default(false);
            $table->string('text_color', 20);
            $table->string('accent_color', 20);
            $table->enum('font', ['sans', 'serif', 'mono'])->default('sans');
            $table->string('brand_name');
            $table->boolean('show_cta')->default(true);
            $table->boolean('show_brand')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_templates');
    }
};
