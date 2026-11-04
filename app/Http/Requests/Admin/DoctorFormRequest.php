<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

abstract class DoctorFormRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->exists('is_active')) {
            return;
        }

        $value = $this->input('is_active');
        if (in_array($value, [true, 1, '1', 'true'], true)) {
            $this->merge(['is_active' => true]);
        } elseif (in_array($value, [false, 0, '0', 'false'], true)) {
            $this->merge(['is_active' => false]);
        }
    }

    /** @return array<string, array<int, mixed>|string> */
    protected function doctorRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'name_bn' => ['nullable', 'string', 'max:255'],
            'credentials' => ['nullable', 'string', 'max:255'],
            'credentials_bn' => ['nullable', 'string', 'max:255'],
            'specialty' => ['nullable', 'string', 'max:255'],
            'specialty_bn' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'bio_bn' => ['nullable', 'string'],
            'govt_reg_no' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'appointment_phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'hero_title_1' => ['nullable', 'string', 'max:255'],
            'hero_title_2' => ['nullable', 'string', 'max:255'],
            'hero_title_3' => ['nullable', 'string', 'max:255'],
            'hero_subtitle' => ['nullable', 'string', 'max:255'],
            'hero_description' => ['nullable', 'string'],
            'hero_title_1_bn' => ['nullable', 'string', 'max:255'],
            'hero_title_2_bn' => ['nullable', 'string', 'max:255'],
            'hero_title_3_bn' => ['nullable', 'string', 'max:255'],
            'hero_subtitle_bn' => ['nullable', 'string', 'max:255'],
            'hero_description_bn' => ['nullable', 'string'],
            'social_facebook' => ['nullable', 'url', 'max:255'],
            'social_twitter' => ['nullable', 'url', 'max:255'],
            'social_youtube' => ['nullable', 'url', 'max:255'],
            'social_instagram' => ['nullable', 'url', 'max:255'],
            'social_linkedin' => ['nullable', 'url', 'max:255'],
            'social_whatsapp' => ['nullable', 'string', 'max:255'],
            'social_tiktok' => ['nullable', 'url', 'max:255'],
            'social_telegram' => ['nullable', 'url', 'max:255'],
            'social_website' => ['nullable', 'url', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
