<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'username')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Username identities cannot be safely removed. Use a forward migration instead of rolling back this migration.'
        );
    }
};
