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
            'phone' => 'required|string|max:20',
            'preferred_date' => 'nullable|date',
            'preferred_time' => 'nullable|date_format:H:i',
            'message' => 'nullable|string',
        ]);

        AppointmentRequest::create($validated);

        return back()->with('success', 'Your appointment request has been submitted successfully! We will contact you soon.');
    }
}
