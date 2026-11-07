<?php

namespace App\Http\Controllers;

use App\Models\AppointmentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppointmentRequestController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => ['required', 'regex:/^(\+?8801|01)[3-9]\d{8}$/'],
            'preferred_date' => 'nullable|date|after_or_equal:today',
            'preferred_time' => 'nullable|date_format:H:i',
            'message' => 'nullable|string|max:1000',
            'website' => 'prohibited',
        ], [
            'website.prohibited' => 'Spam submission detected.',
        ]);

        DB::transaction(function () use ($validated): void {
            $appointmentRequest = AppointmentRequest::query()->create([
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'preferred_date' => $validated['preferred_date'] ?? null,
                'preferred_time' => $validated['preferred_time'] ?? null,
                'message' => $validated['message'] ?? null,
                'source' => 'website',
                'status' => 'pending',
            ]);

            $appointmentRequest->events()->create([
                'event_type' => 'submitted',
                'new_status' => 'pending',
            ]);
        });

        return back()->with('success', 'Your appointment request has been submitted successfully! We will contact you soon.');
    }
}
