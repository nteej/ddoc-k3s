<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('file_email_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('file_id');
            $table->uuid('sent_by_user_id');
            $table->string('recipient_email');
            $table->text('message')->nullable();
            $table->enum('status', ['sent', 'failed'])->default('sent');
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at');

            $table->foreign('file_id')->references('id')->on('files')->onDelete('cascade');
            $table->index('file_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('file_email_logs');
    }
};
