<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Doctor extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'name_bn',
        'credentials',
        'credentials_bn',
        'specialty',
        'specialty_bn',
        'bio',
        'bio_bn',
        'photo_path',
        'govt_reg_no',
        'phone',
        'appointment_phone',
        'email',
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
        'social_linkedin',
        'social_whatsapp',
        'social_tiktok',
        'social_telegram',
        'social_website',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
