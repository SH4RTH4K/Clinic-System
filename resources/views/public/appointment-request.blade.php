@extends('layouts.public')

@section('content')
    <div class="mx-auto max-w-3xl">
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-gray-800">Appointment Request</h1>
            <p class="mt-2 text-gray-600">Choose a preferred date and time. The clinic will contact you to confirm availability.</p>
        </div>

        <section class="rounded-lg bg-white p-6 shadow-sm" aria-labelledby="appointment-form-heading">
            <h2 id="appointment-form-heading" class="mb-5 text-xl font-bold">Request an Appointment</h2>

            @if(session('success'))
                <div class="mb-5 rounded border border-green-300 bg-green-50 px-4 py-3 text-green-800" role="status">
                    {{ session('success') }}
                </div>
            @endif

            @if($errors->any())
                <div class="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-800" role="alert">
                    Please review the highlighted fields and try again.
                </div>
            @endif

            <form action="{{ route('appointment.store') }}" method="POST" class="space-y-4">
                @csrf
                <div class="hidden" aria-hidden="true">
                    <label for="website">Website</label>
                    <input id="website" type="text" name="website" tabindex="-1" autocomplete="off" value="">
                </div>

                <div>
                    <label for="appointment-name" class="block text-sm font-medium text-gray-700">Name <span aria-hidden="true">*</span></label>
                    <input id="appointment-name" type="text" name="name" value="{{ old('name') }}" required maxlength="255" autocomplete="name"
                           class="mt-1 block w-full rounded-md border p-2 shadow-sm {{ $errors->has('name') ? 'border-red-500' : 'border-gray-300' }}"
                           @if($errors->has('name')) aria-invalid="true" aria-describedby="appointment-name-error" @endif>
                    @error('name')<p id="appointment-name-error" class="mt-1 text-sm text-red-700">{{ $message }}</p>@enderror
                </div>

                <div>
                    <label for="appointment-phone" class="block text-sm font-medium text-gray-700">Phone <span aria-hidden="true">*</span></label>
                    <input id="appointment-phone" type="tel" name="phone" value="{{ old('phone') }}" required maxlength="14" autocomplete="tel"
                           class="mt-1 block w-full rounded-md border p-2 shadow-sm {{ $errors->has('phone') ? 'border-red-500' : 'border-gray-300' }}"
                           @if($errors->has('phone')) aria-invalid="true" aria-describedby="appointment-phone-error" @endif>
                    @error('phone')<p id="appointment-phone-error" class="mt-1 text-sm text-red-700">{{ $message }}</p>@enderror
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label for="preferred-date" class="block text-sm font-medium text-gray-700">Preferred Date</label>
                        <input id="preferred-date" type="date" name="preferred_date" value="{{ old('preferred_date') }}"
                               class="mt-1 block w-full rounded-md border p-2 shadow-sm {{ $errors->has('preferred_date') ? 'border-red-500' : 'border-gray-300' }}"
                               @if($errors->has('preferred_date')) aria-invalid="true" aria-describedby="preferred-date-error" @endif>
                        @error('preferred_date')<p id="preferred-date-error" class="mt-1 text-sm text-red-700">{{ $message }}</p>@enderror
                    </div>
                    <div>
                        <label for="preferred-time" class="block text-sm font-medium text-gray-700">Preferred Time</label>
                        <input id="preferred-time" type="time" name="preferred_time" value="{{ old('preferred_time') }}"
                               class="mt-1 block w-full rounded-md border p-2 shadow-sm {{ $errors->has('preferred_time') ? 'border-red-500' : 'border-gray-300' }}"
                               @if($errors->has('preferred_time')) aria-invalid="true" aria-describedby="preferred-time-error" @endif>
                        @error('preferred_time')<p id="preferred-time-error" class="mt-1 text-sm text-red-700">{{ $message }}</p>@enderror
                    </div>
                </div>

                <div>
                    <label for="appointment-message" class="block text-sm font-medium text-gray-700">Message (optional)</label>
                    <textarea id="appointment-message" name="message" rows="4" maxlength="1000"
                              class="mt-1 block w-full rounded-md border p-2 shadow-sm {{ $errors->has('message') ? 'border-red-500' : 'border-gray-300' }}"
                              @if($errors->has('message')) aria-invalid="true" aria-describedby="appointment-message-error" @endif>{{ old('message') }}</textarea>
                    @error('message')<p id="appointment-message-error" class="mt-1 text-sm text-red-700">{{ $message }}</p>@enderror
                </div>

                <div class="flex flex-wrap items-center gap-4 pt-2">
                    <button type="submit" class="rounded-lg bg-primary-600 px-5 py-3 font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                        Send Appointment Request
                    </button>
                    <a href="{{ route('contact') }}" class="font-medium text-primary-700 hover:underline">Contact details</a>
                </div>
            </form>
        </section>
    </div>
@endsection
