<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->string('hero_title_1')->nullable();
            $table->string('hero_title_2')->nullable();
            $table->string('hero_title_3')->nullable();
            $table->string('hero_subtitle')->nullable();
            $table->text('hero_description')->nullable();
            $table->string('hero_title_1_bn')->nullable();
            $table->string('hero_title_2_bn')->nullable();
            $table->string('hero_title_3_bn')->nullable();
            $table->string('hero_subtitle_bn')->nullable();
            $table->text('hero_description_bn')->nullable();
            $table->string('social_facebook')->nullable();
            $table->string('social_twitter')->nullable();
            $table->string('social_youtube')->nullable();
            $table->string('social_instagram')->nullable();
        });

        $settings = DB::table('clinic_settings')->orderBy('id')->first();

        if (! $settings) {
            return;
        }

        $doctor = DB::table('doctors')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->orderBy('id')
            ->first();

        $heroAndSocialData = [
            'hero_title_1' => $settings->hero_title_1 ?? null,
            'hero_title_2' => $settings->hero_title_2 ?? null,
            'hero_title_3' => $settings->hero_title_3 ?? null,
            'hero_subtitle' => $settings->hero_subtitle ?? null,
            'hero_description' => $settings->hero_description ?? null,
            'hero_title_1_bn' => $settings->hero_title_1_bn ?? null,
            'hero_title_2_bn' => $settings->hero_title_2_bn ?? null,
            'hero_title_3_bn' => $settings->hero_title_3_bn ?? null,
            'hero_subtitle_bn' => $settings->hero_subtitle_bn ?? null,
            'hero_description_bn' => $settings->hero_description_bn ?? null,
            'social_facebook' => $settings->social_facebook ?? null,
            'social_twitter' => $settings->social_twitter ?? null,
            'social_youtube' => $settings->social_youtube ?? null,
            'social_instagram' => $settings->social_instagram ?? null,
        ];

        if (! $doctor && ! empty($settings->doctor_name)) {
            DB::table('doctors')->insert([
                ...$heroAndSocialData,
                'name' => $settings->doctor_name,
                'credentials' => $settings->doctor_credentials ?? null,
                'govt_reg_no' => $settings->govt_reg_no ?? null,
                'phone' => $settings->phone ?? null,
                'is_active' => true,
                'sort_order' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return;
        }

        if ($doctor) {
            $updates = [
                'updated_at' => now(),
            ];

            foreach ($heroAndSocialData as $column => $value) {
                if (blank($doctor->{$column}) && filled($value)) {
                    $updates[$column] = $value;
                }
            }

            foreach ([
                'credentials' => $settings->doctor_credentials ?? null,
                'govt_reg_no' => $settings->govt_reg_no ?? null,
                'phone' => $settings->phone ?? null,
            ] as $column => $value) {
                if (blank($doctor->{$column}) && filled($value)) {
                    $updates[$column] = $value;
                }
            }

            if (count($updates) > 1) {
                DB::table('doctors')->where('id', $doctor->id)->update($updates);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropColumn([
                'hero_title_1',
                'hero_title_2',
                'hero_title_3',
                'hero_subtitle',
                'hero_description',
                'hero_title_1_bn',
                'hero_title_2_bn',
                'hero_title_3_bn',
                'hero_subtitle_bn',
                'hero_description_bn',
                'social_facebook',
                'social_twitter',
                'social_youtube',
                'social_instagram',
            ]);
        });
    }
};
