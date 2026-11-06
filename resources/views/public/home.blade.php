@extends('layouts.public')

@section('content')
    @php
        $slides = ($heroDoctors ?? collect())->values();
        $hasDoctors = $slides->isNotEmpty();

        if (!$hasDoctors) {
            $slides = collect([null]);
        }
    @endphp

    <section aria-roledescription="carousel" aria-label="Featured Doctors" class="relative mb-12 overflow-hidden rounded-2xl border border-primary-300 bg-primary-100 shadow-xl">
        <!-- Self-hosted decorative background pattern without external image network requests -->
        <div class="absolute inset-0 bg-gradient-to-br from-primary-100 via-primary-50 to-primary-100/70 pointer-events-none"></div>
        <div class="absolute left-1/3 top-6 -translate-x-1/2 transform opacity-25 pointer-events-none" aria-hidden="true">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 0H60V40H100V60H60V100H40V60H0V40H40V0Z" fill="#147a96"/>
            </svg>
        </div>

        <div class="relative z-10">
            @foreach($slides as $doctor)
                @php
                    $name = $doctor?->name ?? ($settings->doctor_name ?? 'Doctor');
                    $contactPhone = $doctor?->phone ?: ($settings->phone ?? '+000 1234 5678');
                    $appointmentPhone = $doctor?->appointment_phone ?: ($settings->phone ?? $contactPhone);
                    $title1 = $doctor?->hero_title_1 ?: 'Professional';
                    $title2 = $doctor?->hero_title_2 ?: 'Doctor';
                    $title3 = $doctor?->hero_title_3 ?: ($doctor?->specialty ?: 'Specialist');
                    $subtitle = $doctor?->hero_subtitle ?: 'We Care about your Health';
                    $description = $doctor?->hero_description
                        ?: ($doctor?->bio ?: (($settings->clinic_name_en ?? 'Homeopathy Clinic') . ' provides holistic care, blending natural remedies with modern science to promote true well-being.'));
                    $doctorBio = $doctor?->bio;
                    $doctorDetails = array_filter([
                        'Credentials' => $doctor?->credentials,
                        'Specialty' => $doctor?->specialty,
                        'Reg. No.' => $doctor?->govt_reg_no,
                        'Contact' => $contactPhone,
                        'Appointment' => $appointmentPhone,
                        'Email' => $doctor?->email,
                    ]);
                    $whatsapp = $doctor?->social_whatsapp;
                    $whatsappUrl = null;

                    if ($whatsapp) {
                        $whatsappUrl = \Illuminate\Support\Str::startsWith($whatsapp, ['http://', 'https://'])
                            ? $whatsapp
                            : 'https://wa.me/' . preg_replace('/\D+/', '', $whatsapp);
                    }

                    $socials = [
                        ['url' => $doctor?->social_facebook, 'label' => 'Facebook', 'icon' => 'facebook', 'color' => 'text-blue-600'],
                        ['url' => $doctor?->social_twitter, 'label' => 'Twitter/X', 'icon' => 'x', 'color' => 'text-gray-900'],
                        ['url' => $doctor?->social_youtube, 'label' => 'YouTube', 'icon' => 'youtube', 'color' => 'text-red-600'],
                        ['url' => $doctor?->social_instagram, 'label' => 'Instagram', 'icon' => 'instagram', 'color' => 'text-pink-600'],
                        ['url' => $doctor?->social_linkedin, 'label' => 'LinkedIn', 'icon' => 'linkedin', 'color' => 'text-sky-700'],
                        ['url' => $whatsappUrl, 'label' => 'WhatsApp', 'icon' => 'whatsapp', 'color' => 'text-green-600'],
                        ['url' => $doctor?->social_tiktok, 'label' => 'TikTok', 'icon' => 'tiktok', 'color' => 'text-gray-900'],
                        ['url' => $doctor?->social_telegram, 'label' => 'Telegram', 'icon' => 'telegram', 'color' => 'text-sky-600'],
                        ['url' => $doctor?->social_website, 'label' => 'Website', 'icon' => 'website', 'color' => 'text-primary-700'],
                    ];
                @endphp

                <article class="doctor-slide {{ $loop->first ? '' : 'hidden' }}" data-doctor-slide="{{ $loop->index }}" aria-hidden="{{ $loop->first ? 'false' : 'true' }}">
                    <div class="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8">
                        <div class="mb-2 flex justify-end gap-2">
                            @foreach($socials as $social)
                                @if(!empty($social['url']))
                                    <a href="{{ $social['url'] }}"
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       aria-label="Visit {{ $name }} on {{ $social['label'] }}"
                                       class="flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/80 {{ $social['color'] }} shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        @switch($social['icon'])
                                            @case('facebook')
                                                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6v2.1h-3v3.2h3V21h3.9Z" /></svg>
                                                @break
                                            @case('x')
                                                <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 3h2.8l-6.1 7 7.2 11h-5.6l-4.4-6.8L6.9 21H4.1l6.5-7.5L3.7 3h5.8l4 6.2L18.9 3Zm-1 16.1h1.6L8.6 4.8H6.9l11 14.3Z" /></svg>
                                                @break
                                            @case('youtube')
                                                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z" /><path fill="white" d="m10 15.2 5.2-3.2L10 8.8v6.4Z" /></svg>
                                                @break
                                            @case('instagram')
                                                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2" /><circle cx="17.5" cy="6.8" r="1.2" fill="currentColor" /></svg>
                                                @break
                                            @case('linkedin')
                                                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 8.5H2.2V21H5V8.5ZM3.6 6.8a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM21.8 13.8c0-3.8-2-5.6-4.7-5.6a4.1 4.1 0 0 0-3.7 2V8.5h-2.8V21h2.8v-6.2c0-1.6.3-3.2 2.3-3.2s2 1.9 2 3.3V21h2.9l1.2-7.2Z" /></svg>
                                                @break
                                            @case('whatsapp')
                                                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.2 3.8A11.5 11.5 0 0 0 2.1 17.7L.7 23.1l5.5-1.4A11.5 11.5 0 0 0 20.2 3.8ZM12 20.5a9.5 9.5 0 0 1-4.8-1.3l-.4-.2-3.2.8.8-3.1-.2-.5A9.5 9.5 0 1 1 12 20.5Z" /><path fill="currentColor" d="M16.9 13.9c-.3-.2-1.7-.9-2-.9-.2-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.2-1.3-.8-.7-1.3-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.1-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.1 3c.2.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.3s-.3-.3-.6-.5Z" /></svg>
                                                @break
                                            @case('tiktok')
                                                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.6 7.1a6.2 6.2 0 0 1-4-1.8v8.2a5.7 5.7 0 1 1-5.7-5.7c.4 0 .8 0 1.1.1v3.2a2.5 2.5 0 1 0 1.5 2.4V2h3.3a6.2 6.2 0 0 0 3.8 4.1v1Z" /></svg>
                                                @break
                                            @case('telegram')
                                                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m21.7 4.3-3.2 15.2c-.2 1.1-.8 1.4-1.7.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2L6.4 13.5l-4.6-1.4c-1-.3-1-1 .2-1.5L20 4c.8-.3 1.5.2 1.7.3Z" /></svg>
                                                @break
                                            @default
                                                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" /><path d="M3.5 12h17M12 3c2.2 2.4 3.2 5.4 3.2 9s-1 6.6-3.2 9c-2.2-2.4-3.2-5.4-3.2-9s1-6.6 3.2-9Z" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>
                                        @endswitch
                                    </a>
                                @endif
                            @endforeach
                        </div>

                        <div class="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
                            <div class="space-y-3 lg:col-span-6">
                                <div class="text-xs font-bold uppercase tracking-widest text-primary-700 sm:text-sm">{{ $title1 }}</div>
                                <h1 class="text-3xl font-extrabold uppercase leading-tight tracking-tight text-primary-900 sm:text-4xl lg:text-5xl">
                                    {{ $title2 }} <span class="text-primary-700 font-bold text-2xl sm:text-3xl lg:text-4xl block sm:inline sm:ml-2">{{ $title3 }}</span>
                                </h1>

                                <h2 class="text-base font-bold text-primary-800 sm:text-lg">"{{ $subtitle }}"</h2>

                                <p class="max-w-lg whitespace-pre-line break-words text-xs font-medium leading-relaxed text-gray-800 sm:text-sm">
                                    {{ $description }}
                                </p>

                                @if($doctor && (count($doctorDetails) > 0 || !empty($doctorBio)))
                                    <div class="max-w-lg rounded-xl border border-white/80 bg-white/75 p-3 shadow-xs backdrop-blur">
                                        <div class="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-2">
                                            <div class="text-[11px] font-extrabold uppercase tracking-wider text-primary-800">Doctor Profile</div>
                                            <div class="text-xs font-bold text-gray-900">{{ $name }}</div>
                                        </div>

                                        @if(count($doctorDetails) > 0)
                                            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                @foreach($doctorDetails as $label => $value)
                                                    <div class="min-w-0 break-words">
                                                        <span class="font-semibold text-gray-500 text-[10px] uppercase">{{ $label }}:</span>
                                                        <span class="font-bold text-gray-900 text-xs ml-1">{{ $value }}</span>
                                                    </div>
                                                @endforeach
                                            </div>
                                        @endif
                                    </div>
                                @endif

                                <!-- Appointment Call CTA & 3 Feature Badges in one compact row -->
                                <div class="flex flex-wrap items-center gap-3 pt-1">
                                    <a href="tel:{{ $appointmentPhone }}"
                                       class="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 text-sm shadow-md transition focus:outline-none focus:ring-2 focus:ring-red-500">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                        <span>Call: {{ $appointmentPhone }}</span>
                                    </a>

                                    <div class="flex items-center gap-2.5">
                                        <div class="flex items-center gap-1 text-[11px] font-semibold text-primary-900">
                                            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-xs" aria-hidden="true">
                                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                                            </div>
                                            <span class="leading-tight hidden sm:inline">Medical<br>Checkup</span>
                                        </div>
                                        <div class="flex items-center gap-1 text-[11px] font-semibold text-primary-900">
                                            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-xs" aria-hidden="true">
                                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                            </div>
                                            <span class="leading-tight hidden sm:inline">Quick<br>Appt</span>
                                        </div>
                                        <div class="flex items-center gap-1 text-[11px] font-semibold text-primary-900">
                                            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-xs" aria-hidden="true">
                                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                                            </div>
                                            <span class="leading-tight hidden sm:inline">Medicine<br>Service</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right column with scaled doctor photo & shield -->
                            <div class="relative flex items-center justify-center lg:col-span-6 min-h-[300px] lg:min-h-[380px]">
                                <div class="absolute inset-0 z-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                                    <svg class="h-auto w-[82%] max-w-[360px] text-primary-400" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="4">
                                        <path d="M50 5 L95 20 V60 C95 90 50 115 50 115 C50 115 5 90 5 60 V20 L50 5 Z" stroke-linejoin="round"/>
                                        <path d="M35 45 H65 M50 30 V60" stroke-width="8" stroke-linecap="round"/>
                                    </svg>
                                </div>

                                @if($doctor?->photo_path)
                                    <img src="{{ route('doctors.photo', $doctor) }}"
                                         alt="Portrait of {{ $name }}"
                                         width="340"
                                         height="380"
                                         loading="lazy"
                                         class="z-10 max-h-[300px] sm:max-h-[340px] lg:max-h-[370px] w-auto object-contain drop-shadow-xl" />
                                @else
                                    <div class="z-10 flex h-44 w-44 items-center justify-center rounded-full border-6 border-white bg-gray-200 shadow-xl" aria-hidden="true">
                                        <svg class="h-16 w-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                    </div>
                                @endif

                                <div class="absolute bottom-1 z-20">
                                    <div class="whitespace-nowrap rounded-full border-2 border-white bg-primary-600 px-6 py-1.5 text-center text-sm sm:text-base font-extrabold text-white shadow-md">
                                        {{ $name }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            @endforeach
        </div>

        @if($slides->count() > 1)
            <div class="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3" aria-label="Carousel navigation">
                <button type="button" data-doctor-prev class="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary-700 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" aria-label="Previous doctor slide">&lt;</button>
                <div class="flex gap-2" role="tablist" aria-label="Slide dots">
                    @foreach($slides as $doctor)
                        <button type="button" data-doctor-dot="{{ $loop->index }}" class="h-3 w-3 rounded-full {{ $loop->first ? 'bg-primary-600' : 'bg-white/80' }} focus:outline-none focus:ring-2 focus:ring-primary-500" aria-label="Show doctor slide {{ $loop->iteration }}"></button>
                    @endforeach
                </div>
                <button type="button" data-doctor-next class="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary-700 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" aria-label="Next doctor slide">&gt;</button>
            </div>
        @endif
    </section>

    @php
        $scheduleRaw = $settings->visiting_hours_schedule ?? [];
        $isOldFormat = isset($scheduleRaw[0]) && isset($scheduleRaw[0]['day']);

        if ($isOldFormat) {
            $hoursMode = 'selected_hours';
            $hoursDays = [];

            foreach ($scheduleRaw as $row) {
                $slots = [];

                if (!empty($row['morning_from']) && !empty($row['morning_to'])) {
                    $slots[] = ['from' => $row['morning_from'], 'to' => $row['morning_to']];
                }

                if (!empty($row['evening_from']) && !empty($row['evening_to'])) {
                    $slots[] = ['from' => $row['evening_from'], 'to' => $row['evening_to']];
                }

                if (isset($row['open']) && !$row['open']) {
                    $slots = [];
                }

                $hoursDays[$row['day']] = $slots;
            }
        } else {
            $hoursMode = $scheduleRaw['mode'] ?? 'no_hours';
            $hoursDays = $scheduleRaw['days'] ?? [];
        }
    @endphp

    @if($hoursMode !== 'no_hours')
        <section class="mx-auto mb-12 max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 class="mb-6 text-center text-2xl font-bold text-gray-900">
                {{ app()->getLocale() === 'bn' ? 'সাক্ষাতের সময়সূচি' : 'Visiting Hours' }}
            </h2>

            @if($hoursMode === 'always_open')
                <div class="text-center">
                    <span class="inline-flex items-center gap-2 rounded-full bg-green-100 px-6 py-3 text-lg font-bold text-green-800">
                        {{ app()->getLocale() === 'bn' ? 'সার্বক্ষণিক খোলা' : 'Always Open' }}
                    </span>
                </div>
            @elseif($hoursMode === 'permanently_closed')
                <div class="text-center">
                    <span class="inline-flex items-center gap-2 rounded-full bg-red-100 px-6 py-3 text-lg font-bold text-red-800">
                        {{ app()->getLocale() === 'bn' ? 'স্থায়ীভাবে বন্ধ' : 'Permanently Closed' }}
                    </span>
                </div>
            @elseif($hoursMode === 'temporarily_closed')
                <div class="text-center">
                    <span class="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-6 py-3 text-lg font-bold text-yellow-800">
                        {{ app()->getLocale() === 'bn' ? 'সাময়িকভাবে বন্ধ' : 'Temporarily Closed' }}
                    </span>
                </div>
            @elseif($hoursMode === 'selected_hours' && count($hoursDays) > 0)
                <div class="overflow-hidden rounded-lg border border-gray-200">
                    <table class="w-full text-sm">
                        <thead class="bg-primary-600 text-white">
                            <tr>
                                <th class="w-32 px-4 py-3 text-left font-semibold">{{ app()->getLocale() === 'bn' ? 'বার' : 'Day' }}</th>
                                <th class="px-4 py-3 text-center font-semibold">{{ app()->getLocale() === 'bn' ? 'সময়' : 'Hours' }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 bg-white">
                            @php
                                $dayNames = [
                                    'Saturday' => ['en' => 'Saturday', 'bn' => 'শনিবার'],
                                    'Sunday' => ['en' => 'Sunday', 'bn' => 'রবিবার'],
                                    'Monday' => ['en' => 'Monday', 'bn' => 'সোমবার'],
                                    'Tuesday' => ['en' => 'Tuesday', 'bn' => 'মঙ্গলবার'],
                                    'Wednesday' => ['en' => 'Wednesday', 'bn' => 'বুধবার'],
                                    'Thursday' => ['en' => 'Thursday', 'bn' => 'বৃহস্পতিবার'],
                                    'Friday' => ['en' => 'Friday', 'bn' => 'শুক্রবার'],
                                ];
                            @endphp
                            @foreach($dayNames as $dayKey => $labels)
                                @php
                                    $slots = $hoursDays[$dayKey] ?? [];
                                    $validSlots = array_values(array_filter($slots, fn($slot) => !empty($slot['from']) && !empty($slot['to'])));
                                @endphp
                                <tr class="{{ count($validSlots) === 0 ? 'bg-red-50/50' : '' }}">
                                    <td class="px-4 py-3 font-semibold text-gray-900">
                                        {{ app()->getLocale() === 'bn' ? $labels['bn'] : $labels['en'] }}
                                    </td>
                                    @if(count($validSlots) > 0)
                                        <td class="px-4 py-3 text-center text-gray-800">
                                            @foreach($validSlots as $slot)
                                                <div>
                                                    {{ \Carbon\Carbon::parse($slot['from'])->format('g:i A') }}
                                                    <span class="mx-1 text-gray-400">-</span>
                                                    {{ \Carbon\Carbon::parse($slot['to'])->format('g:i A') }}
                                                </div>
                                            @endforeach
                                        </td>
                                    @else
                                        <td class="px-4 py-3 text-center font-medium text-red-600">
                                            {{ app()->getLocale() === 'bn' ? 'বন্ধ' : 'Closed' }}
                                        </td>
                                    @endif
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </section>
    @endif

    @if($slides->count() > 1)
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const slides = Array.from(document.querySelectorAll('[data-doctor-slide]'));
                const dots = Array.from(document.querySelectorAll('[data-doctor-dot]'));
                const previous = document.querySelector('[data-doctor-prev]');
                const next = document.querySelector('[data-doctor-next]');
                let current = 0;

                const showSlide = (index) => {
                    current = (index + slides.length) % slides.length;

                    slides.forEach((slide, slideIndex) => {
                        const isCurrent = slideIndex === current;
                        slide.classList.toggle('hidden', !isCurrent);
                        slide.setAttribute('aria-hidden', String(!isCurrent));
                    });

                    dots.forEach((dot, dotIndex) => {
                        dot.classList.toggle('bg-primary-600', dotIndex === current);
                        dot.classList.toggle('bg-white/80', dotIndex !== current);
                    });
                };

                previous?.addEventListener('click', () => showSlide(current - 1));
                next?.addEventListener('click', () => showSlide(current + 1));
                dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));

                // Respect user prefers-reduced-motion
                if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    window.setInterval(() => showSlide(current + 1), 7000);
                }
            });
        </script>
    @endif
@endsection
