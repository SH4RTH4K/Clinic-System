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
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'importResults' => fn () => $request->session()->get('importResults'),
                'download_backup' => fn () => $request->session()->get('download_backup'),
            ],
            'auth' => [
                'user' => $request->user(),
                'permissions' => $request->user() ? $request->user()->getAllPermissions()->pluck('name') : [],
                'roles' => $request->user() ? $request->user()->getRoleNames() : [],
            ],
            'clinic' => function () {
                $settings = ClinicSetting::query()->first();

                return [
                    'name_en' => $settings->clinic_name_en ?? 'RemediQ Clinic',
                    'name_bn' => $settings->clinic_name_bn ?? null,
                    'practice_type' => $settings->practice_type ?? 'homeopathy',
                    'logo_url' => $settings?->logo_path ? route('clinic.logo') : null,
                    'favicon_url' => $settings?->favicon_path ? route('clinic.favicon') : null,
                ];
            },
        ];
    }
}
