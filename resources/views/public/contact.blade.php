@extends('layouts.public')

@section('content')
    <div class="mx-auto max-w-5xl">
        <h1 class="mb-6 text-3xl font-bold text-gray-800">Contact Us</h1>

        <div class="grid gap-8 md:grid-cols-2">
            <section class="rounded-lg bg-white p-6 shadow-sm" aria-labelledby="contact-details-heading">
                <h2 id="contact-details-heading" class="mb-4 text-xl font-bold">Get in Touch</h2>

                <p class="mb-3 text-gray-600">
                    <strong>Address:</strong>
                    {{ $settings->address ?? '123 Healing Street, Wellness City' }}
                </p>
                <p class="mb-3 text-gray-600">
                    <strong>Phone:</strong>
                    @if(!empty($settings->phone))
                        <a class="text-primary-700 hover:underline" href="tel:{{ $settings->phone }}">{{ $settings->phone }}</a>
                    @else
                        (123) 456-7890
                    @endif
                </p>

                <h3 class="mb-2 mt-6 font-bold">Visiting Hours</h3>
                <div class="space-y-1 whitespace-pre-line text-sm text-gray-600">
                    {{ $settings->visiting_hours ?? "Monday - Friday: 9:00 AM - 8:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed" }}
                </div>
            </section>

            <section class="flex flex-col items-start justify-center rounded-lg bg-white p-6 shadow-sm" aria-labelledby="appointment-link-heading">
                <h2 id="appointment-link-heading" class="text-xl font-bold">Need an appointment?</h2>
                <p class="mb-5 mt-2 text-gray-600">
                    Send a scheduling request with your preferred date and time. The clinic will contact you to confirm availability.
                </p>
                <a href="{{ route('appointment.request.form') }}"
                   class="inline-flex items-center rounded-lg bg-primary-600 px-5 py-3 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    Request an Appointment
                </a>
            </section>
        </div>
    </div>
@endsection
