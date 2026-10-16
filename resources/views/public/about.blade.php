@extends('layouts.public')

@section('content')
    @php
        $isBn = app()->getLocale() === 'bn';
        $clinicName = ($isBn && !empty($settings->clinic_name_bn))
            ? $settings->clinic_name_bn
            : ($settings->clinic_name_en ?? 'Homeopathy Clinic');

        $aboutText = $isBn
            ? ($settings->about_text_bn ?: $settings->about_text)
            : ($settings->about_text ?: $settings->about_text_bn);

        $defaultAboutEn = "We are dedicated to providing classical homeopathic care adhering to the principles established by Dr. Samuel Hahnemann. Our goal is to promote long-term vitality and natural healing through individualized consultations and carefully selected remedies.";
        $defaultAboutBn = "আমরা ক্লাসিক্যাল হোমিওপ্যাথি চিকিৎসার মাধ্যমে রোগীদের সামগ্রিক সুস্থতা নিশ্চিত করতে প্রতিশ্রুতিবদ্ধ। প্রতিটি রোগীর শারীরিক ও মানসিক লক্ষণসমূহ বিবেচনা করে উপযুক্ত ঔষধ নির্বাচনের মাধ্যমে প্রাকৃতিক আরোগ্য লাভে আমরা সচেষ্ট।";
    @endphp

    <div class="max-w-4xl mx-auto space-y-10">
        <!-- Clinic Overview -->
        <section class="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h1 class="text-3xl font-extrabold text-primary-900 mb-6 border-b border-primary-100 pb-3">
                {{ $isBn ? 'আমাদের সম্পর্কে' : 'About Our Clinic' }}
            </h1>

            <div class="prose max-w-none text-gray-800 leading-relaxed space-y-4">
                @if(!empty($aboutText))
                    <p class="text-base whitespace-pre-line">{{ $aboutText }}</p>
                @else
                    <p class="text-base">{{ $isBn ? $defaultAboutBn : $defaultAboutEn }}</p>
                    <p class="text-base">
                        {{ $isBn
                            ? 'আমাদের চেম্বারে প্রতিটি রোগীর কেস হিস্ট্রি অত্যন্ত যত্ন সহকারে নথিভুক্ত করা হয় এবং সঠিক পরামর্শ প্রদান করা হয়।'
                            : 'Every patient is evaluated with thorough case-taking, taking into account constitutional symptoms, lifestyle, and individual health factors.' }}
                    </p>
                @endif
            </div>

            <!-- Clinic Contact & Location Info -->
            <div class="mt-8 grid sm:grid-cols-2 gap-4 bg-primary-50/50 p-5 rounded-xl border border-primary-100">
                <div>
                    <h2 class="text-xs font-bold uppercase tracking-wider text-primary-700">{{ $isBn ? 'চেম্বারের ঠিকানা' : 'Chamber Address' }}</h2>
                    <p class="mt-1 text-sm font-semibold text-gray-900">{{ $settings->address ?? 'N/A' }}</p>
                </div>
                <div>
                    <h2 class="text-xs font-bold uppercase tracking-wider text-primary-700">{{ $isBn ? 'যোগাযোগের ফোন' : 'Contact Phone' }}</h2>
                    <p class="mt-1 text-sm font-semibold text-gray-900">
                        @if(!empty($settings->phone))
                            <a href="tel:{{ $settings->phone }}" class="text-primary-700 hover:underline">{{ $settings->phone }}</a>
                        @else
                            N/A
                        @endif
                    </p>
                </div>
            </div>
        </section>

        <!-- Registered Doctors Section -->
        @if(isset($doctors) && $doctors->isNotEmpty())
            <section class="space-y-6">
                <h2 class="text-2xl font-bold text-gray-900">
                    {{ $isBn ? 'আমাদের চিকিৎসকগণ' : 'Treating Doctors' }}
                </h2>

                <div class="grid gap-6 sm:grid-cols-2">
                    @foreach($doctors as $doctor)
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <div class="flex items-center gap-4 mb-4">
                                    @if($doctor->photo_path)
                                        <img src="{{ asset('storage/' . $doctor->photo_path) }}"
                                             alt="{{ $doctor->name }}"
                                             width="72"
                                             height="72"
                                             loading="lazy"
                                             class="h-16 w-16 rounded-full object-cover border-2 border-primary-300" />
                                    @else
                                        <div class="h-16 w-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl border border-primary-200">
                                            {{ substr($doctor->name, 0, 1) }}
                                        </div>
                                    @endif
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-950">{{ $doctor->name }}</h3>
                                        <p class="text-xs font-semibold text-primary-700">{{ $doctor->credentials }}</p>
                                        @if($doctor->specialty)
                                            <p class="text-xs text-gray-500">{{ $doctor->specialty }}</p>
                                        @endif
                                    </div>
                                </div>

                                @if($doctor->govt_reg_no)
                                    <div class="mb-3 text-xs bg-gray-50 py-1.5 px-3 rounded-md text-gray-700 inline-block font-mono">
                                        {{ $isBn ? 'রেজিস্ট্রেশন নং:' : 'Govt. Reg No:' }} {{ $doctor->govt_reg_no }}
                                    </div>
                                @endif

                                @if($doctor->bio)
                                    <p class="text-xs text-gray-700 leading-relaxed line-clamp-4 mt-2">
                                        {{ $doctor->bio }}
                                    </p>
                                @endif
                            </div>

                            @if($doctor->phone || $doctor->appointment_phone)
                                <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                                    <span class="text-gray-500">{{ $isBn ? 'সিরিয়ালের জন্য:' : 'For Appointment:' }}</span>
                                    <a href="tel:{{ $doctor->appointment_phone ?: $doctor->phone }}" class="font-bold text-primary-600 hover:underline">
                                        {{ $doctor->appointment_phone ?: $doctor->phone }}
                                    </a>
                                </div>
                            @endif
                        </div>
                    @endforeach
                </div>
            </section>
        @endif
    </div>
@endsection