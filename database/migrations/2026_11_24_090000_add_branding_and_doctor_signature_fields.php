<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('clinic_settings') && ! Schema::hasColumn('clinic_settings', 'favicon_path')) {
            Schema::table('clinic_settings', function (Blueprint $table): void {
                $table->string('favicon_path')->nullable()->after('logo_path');
            });
        }

        if (Schema::hasTable('doctors')) {
            Schema::table('doctors', function (Blueprint $table): void {
                if (! Schema::hasColumn('doctors', 'signature_path')) {
                    $table->string('signature_path')->nullable()->after('photo_path');
                }
                if (! Schema::hasColumn('doctors', 'seal_path')) {
                    $table->string('seal_path')->nullable()->after('signature_path');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('clinic_settings') && Schema::hasColumn('clinic_settings', 'favicon_path')) {
            Schema::table('clinic_settings', function (Blueprint $table): void {
                $table->dropColumn('favicon_path');
            });
        }

        if (Schema::hasTable('doctors')) {
            Schema::table('doctors', function (Blueprint $table): void {
                $drops = [];
                if (Schema::hasColumn('doctors', 'signature_path')) {
                    $drops[] = 'signature_path';
                }
                if (Schema::hasColumn('doctors', 'seal_path')) {
                    $drops[] = 'seal_path';
                }
                if (! empty($drops)) {
                    $table->dropColumn($drops);
                }
            });
        }
    }
};
