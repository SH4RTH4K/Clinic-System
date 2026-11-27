<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'signature_path',
        'seal_path',
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
        'user_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(DoctorSchedule::class);
    }

    public function leaves(): HasMany
    {
        return $this->hasMany(DoctorLeave::class);
    }

    public function queueTokens(): HasMany
    {
        return $this->hasMany(PatientQueueToken::class);
    }

    public function scopeSearch($query, ?string $search)
    {
        if (blank($search)) {
            return $query;
        }

        $search = trim($search);

        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
                ->orWhere('name_bn', 'like', "%{$search}%")
                ->orWhere('credentials', 'like', "%{$search}%")
                ->orWhere('credentials_bn', 'like', "%{$search}%")
                ->orWhere('specialty', 'like', "%{$search}%")
                ->orWhere('specialty_bn', 'like', "%{$search}%")
                ->orWhere('govt_reg_no', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('appointment_phone', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%");
        });
    }

    public function scopeActive($query, bool $active = true)
    {
        return $query->where('is_active', $active);
    }

    public function scopeAccount($query, ?string $account)
    {
        if (blank($account) || $account === 'all') {
            return $query;
        }

        if ($account === 'linked') {
            return $query->whereNotNull('user_id');
        }

        if ($account === 'unlinked') {
            return $query->whereNull('user_id');
        }

        return $query;
    }
}
