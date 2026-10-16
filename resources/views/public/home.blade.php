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
                        ['url' => $doctor?->social_facebook, 'label' => 'Facebook', 'short' => 'f'],
                        ['url' => $doctor?->social_twitter, 'label' => 'Twitter/X', 'short' => 'x'],
                        ['url' => $doctor?->social_youtube, 'label' => 'YouTube', 'short' => 'yt'],
                        ['url' => $doctor?->social_instagram, 'label' => 'Instagram', 'short' => 'ig'],
                        ['url' => $doctor?->social_linkedin, 'label' => 'LinkedIn', 'short' => 'in'],
                        ['url' => $whatsappUrl, 'label' => 'WhatsApp', 'short' => 'wa'],
                        ['url' => $doctor?->social_tiktok, 'label' => 'TikTok', 'short' => 'tt'],
                        ['url' => $doctor?->social_telegram, 'label' => 'Telegram', 'short' => 'tg'],
                        ['url' => $doctor?->social_website, 'label' => 'Website', 'short' => 'web'],
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
                                       class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-[11px] font-bold uppercase text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        {{ $social['short'] }}
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

                                <p class="max-w-lg text-xs sm:text-sm font-medium leading-relaxed text-gray-800 line-clamp-2">
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
                                                    <div class="truncate">
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
                                    <img src="{{ asset('storage/' . $doctor->photo_path) }}"
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
