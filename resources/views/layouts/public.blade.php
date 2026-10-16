<!DOCTYPE html>
<html lang="{{ app()->getLocale() === 'bn' ? 'bn' : 'en' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">

    @php
        $clinicName = (app()->getLocale() === 'bn' && !empty($settings->clinic_name_bn))
            ? $settings->clinic_name_bn
            : ($settings->clinic_name_en ?? 'Homeopathy Clinic');
    @endphp

    <title>{{ $clinicName }}</title>
    <meta name="description" content="{{ $settings->meta_description ?? $clinicName }}">
    <meta property="og:title" content="{{ $clinicName }}">
    <meta property="og:description" content="{{ $settings->meta_description ?? $clinicName }}">
    <meta property="og:type" content="website">

    @vite('resources/css/app.css')
</head>
<body class="bg-surface text-ink flex flex-col min-h-screen font-sans antialiased">
    <header class="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <!-- Brand logo & title -->
                <a href="/" class="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1">
                    <svg class="h-8 w-8 shrink-0" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="40" height="40" rx="10" fill="#147a96"/>
                        <path d="M16 11V29M24 11V29M16 20H24M11 20H29" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="text-xl font-bold text-primary-500 group-hover:text-primary-700 transition">
                        {{ $clinicName }}
                    </span>
                </a>

                <!-- Desktop navigation links -->
                <nav class="hidden md:flex items-center space-x-6" aria-label="Main Navigation">
                    @php
                        $navItems = [
                            ['route' => 'home', 'url' => '/', 'label_en' => 'Home', 'label_bn' => 'হোম'],
                            ['route' => 'about', 'url' => '/about', 'label_en' => 'About', 'label_bn' => 'পরিচিতি'],
                            ['route' => 'doctors', 'url' => '/doctors', 'label_en' => 'Doctors', 'label_bn' => 'ডাক্তারগণ'],
                            ['route' => 'contact', 'url' => '/contact', 'label_en' => 'Contact', 'label_bn' => 'যোগাযোগ'],
                        ];
                    @endphp

                    @foreach($navItems as $item)
                        @php $isActive = request()->is(ltrim($item['url'], '/') ?: '/'); @endphp
                        <a href="{{ $item['url'] }}"
                           class="text-sm font-semibold transition px-2 py-1 rounded-md {{ $isActive ? 'text-primary-600 border-b-2 border-primary-500 font-bold' : 'text-gray-600 hover:text-primary-600' }}">
                            {{ app()->getLocale() === 'bn' ? $item['label_bn'] : $item['label_en'] }}
                        </a>
                    @endforeach

                    <!-- Language toggle button -->
                    <form method="POST" action="{{ route('language.switch') }}" class="inline m-0">
                        @csrf
                        <input type="hidden" name="locale" value="{{ app()->getLocale() === 'en' ? 'bn' : 'en' }}">
                        <button type="submit"
                                aria-label="Switch Language"
                                class="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-300 rounded-full px-3 py-1 transition">
                            <span class="uppercase">{{ app()->getLocale() === 'en' ? 'বাংলা' : 'EN' }}</span>
                        </button>
                    </form>

                    <!-- Portal login -->
                    <a href="/login"
                       class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition">
                        {{ app()->getLocale() === 'bn' ? 'পোর্টাল লগইন' : 'Portal Login' }}
                    </a>
                </nav>

                <!-- Mobile Hamburger Button -->
                <div class="flex items-center gap-2 md:hidden">
                    <form method="POST" action="{{ route('language.switch') }}" class="inline m-0">
                        @csrf
                        <input type="hidden" name="locale" value="{{ app()->getLocale() === 'en' ? 'bn' : 'en' }}">
                        <button type="submit"
                                aria-label="Switch Language"
                                class="text-xs font-bold text-primary-700 bg-primary-50 border border-primary-300 rounded px-2 py-1">
                            {{ app()->getLocale() === 'en' ? 'বাং' : 'EN' }}
                        </button>
                    </form>

                    <button id="nav-toggle"
                            type="button"
                            aria-expanded="false"
                            aria-controls="mobile-menu"
                            aria-label="Toggle navigation menu"
                            class="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <svg id="icon-menu-open" class="h-6 w-6 block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                        <svg id="icon-menu-close" class="h-6 w-6 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile dropdown menu -->
        <div id="mobile-menu" class="hidden md:hidden border-t border-gray-100 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
            @foreach($navItems as $item)
                @php $isActive = request()->is(ltrim($item['url'], '/') ?: '/'); @endphp
                <a href="{{ $item['url'] }}"
                   class="block px-3 py-2 rounded-md text-base font-medium {{ $isActive ? 'bg-primary-50 text-primary-700 font-bold' : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600' }}">
                    {{ app()->getLocale() === 'bn' ? $item['label_bn'] : $item['label_en'] }}
                </a>
            @endforeach
            <div class="pt-2 border-t border-gray-100">
                <a href="/login" class="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition">
                    {{ app()->getLocale() === 'bn' ? 'পোর্টাল লগইন' : 'Portal Login' }}
                </a>
            </div>
        </div>
    </header>

    <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full">
        @yield('content')
    </main>

    <footer class="bg-gray-900 text-gray-300 py-8 mt-12 border-t border-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
            <p class="text-sm">
                {{ $settings->footer_text ?? ('© ' . date('Y') . ' ' . $clinicName . '. All rights reserved.') }}
            </p>
            @if(!empty($settings->developer_name))
                <p class="text-xs text-gray-500">
                    Developed By: 
                    @if(!empty($settings->developer_link))
                        <a href="{{ $settings->developer_link }}" target="_blank" rel="noopener noreferrer" class="text-primary-400 hover:underline">{{ $settings->developer_name }}</a>
                    @else
                        {{ $settings->developer_name }}
                    @endif
                </p>
            @endif
        </div>
    </footer>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const toggle = document.getElementById('nav-toggle');
            const menu = document.getElementById('mobile-menu');
            const openIcon = document.getElementById('icon-menu-open');
            const closeIcon = document.getElementById('icon-menu-close');

            if (toggle && menu) {
                toggle.addEventListener('click', function () {
                    const isOpen = menu.classList.toggle('hidden') === false;
                    toggle.setAttribute('aria-expanded', String(isOpen));
                    if (openIcon && closeIcon) {
                        openIcon.classList.toggle('hidden', isOpen);
                        closeIcon.classList.toggle('hidden', !isOpen);
                    }
                });

                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
                        menu.classList.add('hidden');
                        toggle.setAttribute('aria-expanded', 'false');
                        if (openIcon && closeIcon) {
                            openIcon.classList.remove('hidden');
                            closeIcon.classList.add('hidden');
                        }
                    }
                });
            }
        });
    </script>
</body>
</html>
