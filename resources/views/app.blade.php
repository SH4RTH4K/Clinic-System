<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" href="{{ route('clinic.favicon') }}">

        @php
            $settings = \App\Models\ClinicSetting::query()->first();
            $locale = app()->getLocale();
            $clinicName = ($locale === 'bn' && !empty($settings?->clinic_name_bn))
                ? $settings->clinic_name_bn
                : ($settings?->clinic_name_en ?? config('app.name', 'RemediQ Clinic'));
        @endphp

        <title inertia>{{ $clinicName }}</title>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased text-ink bg-surface">
        @inertia
    </body>
</html>
