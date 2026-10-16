@extends('layouts.public')

@section('content')
    @php
        $slides = ($heroDoctors ?? collect())->values();
        $hasDoctors = $slides->isNotEmpty();

        if (!$hasDoctors) {
            $slides = collect([null]);
        }
    @endphp

    <section class="relative mb-16 overflow-hidden rounded-2xl border border-blue-100 bg-[#d8f1ff] shadow-xl">
        <div class="absolute inset-0 bg-cover bg-center opacity-[0.04]" style="background-image: url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2000');"></div>
        <div class="absolute left-1/3 top-10 -translate-x-1/2 transform opacity-30">
            <svg width="96" height="96" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 0H60V40H100V60H60V100H40V60H0V40H40V0Z" fill="#58c9e9"/>
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
                        ['url' => $doctor?->social_facebook, 'label' => 'f'],
                        ['url' => $doctor?->social_twitter, 'label' => 'x'],
                        ['url' => $doctor?->social_youtube, 'label' => 'yt'],
                        ['url' => $doctor?->social_instagram, 'label' => 'ig'],
                        ['url' => $doctor?->social_linkedin, 'label' => 'in'],
                        ['url' => $whatsappUrl, 'label' => 'wa'],
                        ['url' => $doctor?->social_tiktok, 'label' => 'tt'],
                        ['url' => $doctor?->social_telegram, 'label' => 'tg'],
                        ['url' => $doctor?->social_website, 'label' => 'web'],
                    ];
                @endphp

                <article class="doctor-slide {{ $loop->first ? '' : 'hidden' }}" data-doctor-slide="{{ $loop->index }}">
                    <div class="px-6 pb-14 pt-8 sm:px-10 lg:px-12 lg:pb-16 lg:pt-9">
                        <div class="mb-3 flex justify-end gap-3">
                            @foreach($socials as $social)
                                @if(!empty($social['url']))
                                    <a href="{{ $social['url'] }}" target="_blank" rel="noopener" class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-xs font-bold uppercase text-white transition hover:bg-[#147a96]">
                                        {{ $social['label'] }}
                                    </a>
                                @endif
                            @endforeach
                        </div>

                        <div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                            <div class="space-y-4 lg:col-span-6">
                                <div class="text-lg font-bold uppercase tracking-widest text-[#147a96] md:text-2xl">{{ $title1 }}</div>
                                <h1 class="text-5xl font-extrabold uppercase leading-none text-[#147a96] md:text-7xl">{{ $title2 }}</h1>
                                <div class="text-2xl font-bold uppercase tracking-wide text-[#147a96] md:text-4xl">{{ $title3 }}</div>

                                <h2 class="pt-2 text-xl font-bold text-[#147a96] md:text-2xl">"{{ $subtitle }}"</h2>

                                <p class="max-w-lg text-base font-medium leading-relaxed text-[#147a96] md:text-lg">
                                    {{ $description }}
                                </p>

                                @if($doctor && (count($doctorDetails) > 0 || !empty($doctorBio)))
                                    <div class="max-w-xl rounded-xl border border-white/70 bg-white/50 p-4 shadow-sm backdrop-blur">
                                        <div class="mb-3">
                                            <div class="text-sm font-extrabold uppercase tracking-widest text-[#147a96]">Doctor Profile</div>
                                            <div class="mt-1 text-lg font-extrabold text-gray-950">{{ $name }}</div>
                                        </div>

                                        @if(count($doctorDetails) > 0)
                                            <div class="grid gap-3 sm:grid-cols-2">
                                                @foreach($doctorDetails as $label => $value)
                                                    <div>
                                                        <div class="text-xs font-bold uppercase tracking-wide text-gray-500">{{ $label }}</div>
                                                        <div class="text-sm font-bold text-gray-900">{{ $value }}</div>
                                                    </div>
                                                @endforeach
                                            </div>
                                        @endif

                                        @if(!empty($doctorBio))
                                            <p class="mt-3 text-sm font-medium leading-6 text-gray-700">
                                                {{ $doctorBio }}
                                            </p>
                                        @endif
                                    </div>
                                @endif

                                <div class="flex gap-5 md:gap-8">
                                    <div class="text-center">
                                        <div class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#147a96] shadow-lg">
                                            <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"></path></svg>
                                        </div>
                                        <p class="text-sm font-bold leading-tight text-[#147a96]">Medical<br>Check up</p>
                                    </div>
                                    <div class="text-center">
                                        <div class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#147a96] shadow-lg">
                                            <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        </div>
                                        <p class="text-sm font-bold leading-tight text-[#147a96]">Quick<br>Appointment</p>
                                    </div>
                                    <div class="text-center">
                                        <div class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#147a96] shadow-lg">
                                            <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                        </div>
                                        <p class="text-sm font-bold leading-tight text-[#147a96]">Medicine<br>Service</p>
                                    </div>
                                </div>

                                <div class="pt-1">
                                    <p class="mb-1 text-base text-gray-800">Contact us to</p>
                                    <p class="mb-3 text-xl font-bold text-[#147a96]">Make an Appointment</p>
                                    <a href="tel:{{ $appointmentPhone }}" class="inline-block rounded-lg bg-[#db0000] px-8 py-2.5 text-xl font-bold text-white shadow-xl transition hover:bg-red-700">
                                        {{ $appointmentPhone }}
                                    </a>
                                </div>
                            </div>

                            <div class="relative mt-8 flex min-h-[460px] items-end justify-center lg:col-span-6 lg:mt-0 lg:min-h-[560px] lg:self-start">
                                <div class="absolute inset-0 z-0 flex items-center justify-center">
                                    <svg class="h-auto w-[78%] text-[#00bfff]" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="4">
                                        <path d="M50 5 L95 20 V60 C95 90 50 115 50 115 C50 115 5 90 5 60 V20 L50 5 Z" stroke-linejoin="round"/>
                                        <path d="M35 45 H65 M50 30 V60" stroke-width="8" stroke-linecap="round"/>
                                    </svg>
                                </div>

                                @if($doctor?->photo_path)
                                    <img src="{{ asset('storage/' . $doctor->photo_path) }}" alt="{{ $name }}" class="z-10 max-h-[400px] w-full max-w-sm translate-y-4 object-contain drop-shadow-2xl lg:max-h-[430px] lg:max-w-md" />
                                @else
                                    <div class="z-10 mb-10 flex h-56 w-56 items-center justify-center rounded-full border-8 border-white bg-gray-300 shadow-2xl">
                                        <svg class="h-20 w-20 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                    </div>
                                @endif

                                <div class="absolute bottom-4 z-20">
                                    <div class="whitespace-nowrap rounded-full border-4 border-white bg-[#71c3d1] px-10 py-3 text-center text-2xl font-extrabold text-white shadow-lg">
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
            <div class="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
                <button type="button" data-doctor-prev class="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#147a96] shadow hover:bg-white" aria-label="Previous doctor slide">&lt;</button>
                <div class="flex gap-2">
                    @foreach($slides as $doctor)
                        <button type="button" data-doctor-dot="{{ $loop->index }}" class="h-2.5 w-2.5 rounded-full {{ $loop->first ? 'bg-[#147a96]' : 'bg-white/80' }}" aria-label="Show doctor slide {{ $loop->iteration }}"></button>
                    @endforeach
                </div>
                <button type="button" data-doctor-next class="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#147a96] shadow hover:bg-white" aria-label="Next doctor slide">&gt;</button>
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
        <section class="mx-auto mb-12 max-w-3xl rounded-lg border border-gray-200 bg-gray-100 p-8 shadow-sm">
            <h2 class="mb-6 text-center text-2xl font-bold text-gray-800">Visiting Hours</h2>

            @if($hoursMode === 'always_open')
                <div class="text-center">
                    <span class="inline-flex items-center gap-2 rounded-full bg-green-100 px-6 py-3 text-lg font-bold text-green-700">
                        Always Open
                    </span>
                </div>
            @elseif($hoursMode === 'permanently_closed')
                <div class="text-center">
                    <span class="inline-flex items-center gap-2 rounded-full bg-red-100 px-6 py-3 text-lg font-bold text-red-700">
                        Permanently Closed
                    </span>
                </div>
            @elseif($hoursMode === 'temporarily_closed')
                <div class="text-center">
                    <span class="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-6 py-3 text-lg font-bold text-yellow-700">
                        Temporarily Closed
                    </span>
                </div>
            @elseif($hoursMode === 'selected_hours' && count($hoursDays) > 0)
                <div class="overflow-hidden rounded-lg border border-gray-200">
                    <table class="w-full text-sm">
                        <thead class="bg-[#147a96] text-white">
                            <tr>
                                <th class="w-28 px-4 py-3 text-left">Day</th>
                                <th class="px-4 py-3 text-center">Hours</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 bg-white">
                            @php $dayOrder = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday']; @endphp
                            @foreach($dayOrder as $dayName)
                                @php
                                    $slots = $hoursDays[$dayName] ?? [];
                                    $validSlots = array_values(array_filter($slots, fn($slot) => !empty($slot['from']) && !empty($slot['to'])));
                                @endphp
                                <tr class="{{ count($validSlots) === 0 ? 'bg-red-50' : '' }}">
                                    <td class="px-4 py-3 font-semibold text-gray-800">{{ $dayName }}</td>
                                    @if(count($validSlots) > 0)
                                        <td class="px-4 py-3 text-center text-gray-700">
                                            @foreach($validSlots as $slot)
                                                <div>
                                                    {{ \Carbon\Carbon::parse($slot['from'])->format('g:i A') }}
                                                    <span class="mx-1 text-gray-400">-</span>
                                                    {{ \Carbon\Carbon::parse($slot['to'])->format('g:i A') }}
                                                </div>
                                            @endforeach
                                        </td>
                                    @else
                                        <td class="px-4 py-3 text-center font-medium text-red-500">Closed</td>
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
                        slide.classList.toggle('hidden', slideIndex !== current);
                    });

                    dots.forEach((dot, dotIndex) => {
                        dot.classList.toggle('bg-[#147a96]', dotIndex === current);
                        dot.classList.toggle('bg-white/80', dotIndex !== current);
                    });
                };

                previous?.addEventListener('click', () => showSlide(current - 1));
                next?.addEventListener('click', () => showSlide(current + 1));
                dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));
                window.setInterval(() => showSlide(current + 1), 7000);
            });
        </script>
    @endif
@endsection
