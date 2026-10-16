<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $settings->clinic_name_en ?? 'Homeopathy Clinic' }}</title>
    @vite('resources/css/app.css')
</head>
<body class="bg-gray-50 flex flex-col min-h-screen">
    <nav class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="/" class="text-xl font-bold text-blue-800">{{ $settings->clinic_name_en ?? 'Homeopathy Clinic' }}</a>
            <div class="space-x-4">
                <a href="/" class="text-gray-600 hover:text-blue-800">Home</a>
                <a href="/about" class="text-gray-600 hover:text-blue-800">About</a>
                <a href="/doctors" class="text-gray-600 hover:text-blue-800">Doctors</a>
                <a href="/contact" class="text-gray-600 hover:text-blue-800">Contact</a>
                <a href="/login" class="bg-blue-600 text-white px-4 py-2 rounded">Portal Login</a>
            </div>
        </div>
    </nav>

    <main class="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        @yield('content')
    </main>

    <footer class="bg-gray-800 text-white py-6 mt-12">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <p>
                {{ $settings->footer_text ?? ('© ' . date('Y') . ' ' . ($settings->clinic_name_en ?? 'Homeopathy Clinic') . '. All rights reserved.') }}
            </p>
            @if(!empty($settings->developer_name))
                <p class="text-sm text-gray-400 mt-2">
                    Developed By: 
                    @if(!empty($settings->developer_link))
                        <a href="{{ $settings->developer_link }}" target="_blank" class="text-blue-400 hover:underline">{{ $settings->developer_name }}</a>
                    @else
                        {{ $settings->developer_name }}
                    @endif
                </p>
            @endif
        </div>
    </footer>
</body>
</html>
