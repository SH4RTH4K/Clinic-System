<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppointmentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AppointmentRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = AppointmentRequest::with('handler')->latest();

        if ($request->status) {
            $query->where('status', $request->status);
        }

        return Inertia::render('Admin/AppointmentRequests/Index', [
            'requests' => $query->paginate(15)->withQueryString(),
            'filters' => $request->only(['status']),
        ]);
    }

    public function update(Request $request, AppointmentRequest $appointmentRequest)
    {
        $validated = $request->validate(['status' => 'required|in:pending,contacted,scheduled,cancelled']);
        $appointmentRequest->update([
            'status' => $validated['status'],
            'handled_by' => Auth::id(),
        ]);

        return back()->with('success', 'Status updated.');
    }

    public function convertToPatient(AppointmentRequest $appointmentRequest)
    {
        // Simple one-click convert
        return redirect()->route('admin.patients.create', [
            'name' => $appointmentRequest->name,
            'phone' => $appointmentRequest->phone,
        ]);
    }
}
