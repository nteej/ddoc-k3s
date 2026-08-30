<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('type', ['hero', 'features', 'how_it_works', 'cta_banner', 'wizard'])->default('hero');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);

            // Per-locale heading / subheading
            $table->string('heading_en', 500)->nullable();
            $table->string('heading_fi', 500)->nullable();
            $table->string('heading_sv', 500)->nullable();
            $table->text('subheading_en')->nullable();
            $table->text('subheading_fi')->nullable();
            $table->text('subheading_sv')->nullable();

            // Complex items (features list, steps) serialised as JSON
            $table->json('items_en')->nullable();
            $table->json('items_fi')->nullable();
            $table->json('items_sv')->nullable();

            // Non-translatable config (button labels/URLs, badge text, stats, etc.)
            $table->json('config')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_sections');
    }
};
