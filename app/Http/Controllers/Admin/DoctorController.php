<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DoctorController extends Controller
{
    public function index(): Response
    {
        $doctors = Doctor::orderBy('sort_order')->orderBy('name')->get();

        return Inertia::render('Admin/Doctors/Index', ['doctors' => $doctors]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Doctors/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateDoctor($request);

        if ($request->hasFile('photo')) {
            $validated['photo_path'] = $request->file('photo')->store('doctors', 'public');
        }

        unset($validated['photo']);
        $validated['is_active'] = $request->boolean('is_active');
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        Doctor::create($validated);

        return redirect()->route('admin.doctors.index')->with('success', 'Doctor added successfully.');
    }

    public function edit(Doctor $doctor): Response
    {
        return Inertia::render('Admin/Doctors/Edit', ['doctor' => $doctor]);
    }

    public function update(Request $request, Doctor $doctor): RedirectResponse
    {
        $validated = $this->validateDoctor($request);

        if ($request->hasFile('photo')) {
            if ($doctor->photo_path) {
                Storage::disk('public')->delete($doctor->photo_path);
            }

            $validated['photo_path'] = $request->file('photo')->store('doctors', 'public');
        }

        unset($validated['photo']);
        $validated['is_active'] = $request->boolean('is_active');
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $doctor->update($validated);

        return redirect()->route('admin.doctors.index')->with('success', 'Doctor updated successfully.');
    }

    public function destroy(Doctor $doctor): RedirectResponse
    {
        if ($doctor->photo_path) {
            Storage::disk('public')->delete($doctor->photo_path);
        }

        $doctor->delete();

        return back()->with('success', 'Doctor deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateDoctor(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'credentials' => 'nullable|string|max:255',
            'credentials_bn' => 'nullable|string|max:255',
            'specialty' => 'nullable|string|max:255',
            'specialty_bn' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'bio_bn' => 'nullable|string',
            'govt_reg_no' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'appointment_phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'hero_title_1' => 'nullable|string|max:255',
            'hero_title_2' => 'nullable|string|max:255',
            'hero_title_3' => 'nullable|string|max:255',
            'hero_subtitle' => 'nullable|string|max:255',
            'hero_description' => 'nullable|string',
            'hero_title_1_bn' => 'nullable|string|max:255',
            'hero_title_2_bn' => 'nullable|string|max:255',
            'hero_title_3_bn' => 'nullable|string|max:255',
            'hero_subtitle_bn' => 'nullable|string|max:255',
            'hero_description_bn' => 'nullable|string',
            'social_facebook' => 'nullable|url|max:255',
            'social_twitter' => 'nullable|url|max:255',
            'social_youtube' => 'nullable|url|max:255',
            'social_instagram' => 'nullable|url|max:255',
            'social_linkedin' => 'nullable|url|max:255',
            'social_whatsapp' => 'nullable|string|max:255',
            'social_tiktok' => 'nullable|url|max:255',
            'social_telegram' => 'nullable|url|max:255',
            'social_website' => 'nullable|url|max:255',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);
    }
}
