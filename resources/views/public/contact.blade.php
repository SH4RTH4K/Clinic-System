@extends('layouts.public')
@section('content')
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Contact Us</h1>
    <div class="grid md:grid-cols-2 gap-8">
        <div class="bg-white p-6 rounded shadow-sm">
            <h3 class="text-xl font-bold mb-4">Get in Touch</h3>
            <p class="text-gray-600 mb-2"><strong>Address:</strong> {{ $settings->address ?? '123 Healing Street, Wellness City' }}</p>
            <p class="text-gray-600 mb-2"><strong>Phone:</strong> {{ $settings->phone ?? '(123) 456-7890' }}</p>
            
            <h4 class="font-bold mt-6 mb-2">Visiting Hours</h4>
            <div class="text-gray-600 space-y-1 text-sm whitespace-pre-line">
                {{ $settings->visiting_hours ?? "Monday - Friday: 9:00 AM - 8:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed" }}
            </div>
        </div>
        <div class="bg-white p-6 rounded shadow-sm">
            <h3 class="text-xl font-bold mb-4">Send us a Message</h3>
            <form action="{{ route('appointment.store') }}" method="POST" class="space-y-4">
                @csrf
                @if(session('success'))
                    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                        {{ session('success') }}
                    </div>
                @endif
                <div>
                    <label class="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" name="name" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="text" name="phone" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Preferred Date</label>
                    <input type="date" name="preferred_date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Preferred Time</label>
                    <input type="time" name="preferred_time" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Message</label>
                    <textarea name="message" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"></textarea>
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Request Appointment</button>
            </form>
        </div>
    </div>
@endsection