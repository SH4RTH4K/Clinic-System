<?php

namespace App\Http\Middleware;

use App\Models\ClinicSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'locale' => app()->getLocale(),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'importResults' => fn () => $request->session()->get('importResults'),
                'download_backup' => fn () => $request->session()->get('download_backup'),
            ],
            'auth' => [
                'user' => $request->user(),
                'permissions' => $request->user() ? $request->user()->getAllPermissions()->pluck('name')->values()->all() : [],
                'roles' => $request->user() ? $request->user()->getRoleNames()->values()->all() : [],
            ],
            'clinic' => function () {
                $settings = ClinicSetting::query()->first();
                $locale = app()->getLocale();
                $nameEn = $settings->clinic_name_en ?? config('app.name', 'RemediQ Clinic');
                $nameBn = $settings->clinic_name_bn ?? null;
                $activeName = ($locale === 'bn' && ! empty($nameBn)) ? $nameBn : $nameEn;

                return [
                    'name' => $activeName,
                    'name_en' => $nameEn,
                    'name_bn' => $nameBn,
                    'practice_type' => $settings->practice_type ?? 'homeopathy',
                    'logo_url' => $settings?->logo_path ? route('clinic.logo') : null,
                    'favicon_url' => $settings?->favicon_path ? route('clinic.favicon') : null,
                ];
            },
        ];
    }
}
