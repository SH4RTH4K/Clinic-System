@extends('layouts.public')
@section('content')
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Our Doctors</h1>
        <p class="mt-2 text-gray-600">Meet the doctors available at {{ $settings->clinic_name_en ?? 'our clinic' }}.</p>
    </div>

    @if($doctors->isEmpty())
        <div class="bg-white p-6 rounded shadow-sm text-gray-600">
            No doctor profiles have been added yet.
        </div>
    @else
        <div class="grid gap-6 md:grid-cols-2">
            @foreach($doctors as $doctor)
                <article class="bg-white p-6 rounded shadow-sm flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div class="h-28 w-28 shrink-0 overflow-hidden rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500">
                        @if($doctor->photo_path)
                            <img
                                class="h-full w-full object-cover"
                                src="{{ asset('storage/' . $doctor->photo_path) }}"
                                alt="{{ $doctor->name }}"
                            >
                        @else
                            Photo
                        @endif
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-xl font-bold text-gray-900">{{ $doctor->name }}</h2>
                        @if($doctor->name_bn)
                            <p class="text-sm font-semibold text-gray-500">{{ $doctor->name_bn }}</p>
                        @endif
                        @if($doctor->credentials)
                            <p class="mt-1 text-gray-600">{{ $doctor->credentials }}</p>
                        @endif
                        @if($doctor->specialty)
                            <p class="mt-2 text-sm font-semibold text-blue-800">{{ $doctor->specialty }}</p>
                        @endif
                        @if($doctor->govt_reg_no)
                            <p class="mt-2 text-sm text-gray-500">Reg. No: {{ $doctor->govt_reg_no }}</p>
                        @endif
                        @if($doctor->phone || $doctor->appointment_phone)
                            <div class="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                                @if($doctor->phone)
                                    <p><span class="font-semibold text-gray-800">Contact:</span> {{ $doctor->phone }}</p>
                                @endif
                                @if($doctor->appointment_phone)
                                    <p><span class="font-semibold text-gray-800">Appointment:</span> {{ $doctor->appointment_phone }}</p>
                                @endif
                            </div>
                        @endif
                        @if($doctor->bio)
                            <p class="mt-3 text-sm leading-6 text-gray-600">{{ $doctor->bio }}</p>
                        @endif
                    </div>
                </article>
            @endforeach
        </div>
    @endif
@endsection
