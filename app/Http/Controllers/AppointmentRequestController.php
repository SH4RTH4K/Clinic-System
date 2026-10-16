<?php

namespace App\Http\Controllers;

use App\Models\AppointmentRequest;
use Illuminate\Http\Request;

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

        AppointmentRequest::create(collect($validated)->except('website')->toArray());

        return back()->with('success', 'Your appointment request has been submitted successfully! We will contact you soon.');
    }
}
