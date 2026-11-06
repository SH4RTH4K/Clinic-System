<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDoctorRequest;
use App\Http\Requests\Admin\UpdateDoctorRequest;
use App\Models\Doctor;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
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

    public function show(Doctor $doctor): Response
    {
        return Inertia::render('Admin/Doctors/Show', ['doctor' => $doctor]);
    }

    public function create(): Response
    {
        $canManageDoctorAccounts = request()->user()->hasRole('Super Admin');

        return Inertia::render('Admin/Doctors/Create', [
            'canManageDoctorAccounts' => $canManageDoctorAccounts,
            'doctorAccounts' => $canManageDoctorAccounts ? $this->availableDoctorAccounts() : [],
        ]);
    }

    public function store(StoreDoctorRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        if ($request->hasFile('photo')) {
            $validated['photo_path'] = $request->file('photo')->store('doctors', 'public');
        }

        unset($validated['photo']);
        $validated['is_active'] = $validated['is_active'] ?? false;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        Doctor::create($validated);

        return redirect()->route('admin.doctors.index')->with('success', 'Doctor added successfully.');
    }

    public function edit(Doctor $doctor): Response
    {
        $canManageDoctorAccounts = request()->user()->hasRole('Super Admin');

        return Inertia::render('Admin/Doctors/Edit', [
            'doctor' => $doctor,
            'canManageDoctorAccounts' => $canManageDoctorAccounts,
            'doctorAccounts' => $canManageDoctorAccounts ? $this->availableDoctorAccounts($doctor) : [],
        ]);
    }

    public function update(UpdateDoctorRequest $request, Doctor $doctor): RedirectResponse
    {
        $validated = $request->validated();
        $newPhotoPath = $request->hasFile('photo')
            ? $request->file('photo')->store('doctors', 'public')
            : null;

        unset($validated['photo']);
        if ($newPhotoPath !== null) {
            $validated['photo_path'] = $newPhotoPath;
        }

        $wasUpdated = DB::transaction(function () use ($doctor, $validated): bool {
            $lockedDoctor = Doctor::query()->lockForUpdate()->findOrFail($doctor->id);

            if (array_key_exists('user_id', $validated)
                && (string) $validated['user_id'] !== (string) $lockedDoctor->user_id
                && Visit::withTrashed()->where('doctor_id', $lockedDoctor->id)->exists()) {
                return false;
            }

            $lockedDoctor->update($validated);

            return true;
        });

        if (! $wasUpdated) {
            if ($newPhotoPath !== null) {
                Storage::disk('public')->delete($newPhotoPath);
            }

            return back()->withErrors([
                'user_id' => 'This Doctor has visit history. Changing the linked account requires a separately approved handover process.',
            ]);
        }

        if ($newPhotoPath !== null && $doctor->photo_path !== null) {
            $this->deleteDoctorPhotoIfUnused($doctor->photo_path, $doctor->id);
        }

        return redirect()->route('admin.doctors.index')->with('success', 'Doctor updated successfully.');
    }

    public function destroy(Doctor $doctor): RedirectResponse
    {
        $deleted = DB::transaction(function () use ($doctor): bool {
            $lockedDoctor = Doctor::query()->lockForUpdate()->findOrFail($doctor->id);

            if (Visit::withTrashed()->where('doctor_id', $lockedDoctor->id)->exists()) {
                return false;
            }

            $lockedDoctor->delete();

            return true;
        });

        if (! $deleted) {
            return back()->withErrors([
                'doctor' => 'This Doctor has visit history. Deactivate the profile instead to preserve clinical authorship.',
            ]);
        }

        if ($doctor->photo_path) {
            Storage::disk('public')->delete($doctor->photo_path);
        }

        return back()->with('success', 'Doctor deleted.');
    }

    /**
     * @return Collection<int, User>
     */
    private function availableDoctorAccounts(?Doctor $doctor = null): Collection
    {
        return User::query()
            ->where('is_active', true)
            ->where(function ($query) use ($doctor): void {
                $query->whereDoesntHave('doctorProfile');

                if ($doctor !== null) {
                    $query->orWhereHas('doctorProfile', fn ($profileQuery) => $profileQuery->whereKey($doctor->id));
                }
            })
            ->orderBy('name')
            ->get(['id', 'name', 'username']);
    }

    private function deleteDoctorPhotoIfUnused(?string $path, int $doctorId): void
    {
        if (! is_string($path)
            || preg_match('/\Adoctors\/[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)\z/i', $path) !== 1
            || Doctor::query()->where('photo_path', $path)->where('id', '!=', $doctorId)->exists()) {
            return;
        }

        Storage::disk('public')->delete($path);

        $legacyRoot = realpath(public_path('storage/doctors'));
        $legacyPath = realpath(public_path('storage/'.$path));

        if (is_string($legacyRoot)
            && is_string($legacyPath)
            && is_file($legacyPath)
            && str_starts_with(
                strtolower($legacyPath),
                strtolower(rtrim($legacyRoot, '\\/').DIRECTORY_SEPARATOR),
            )) {
            File::delete($legacyPath);
        }
    }
}
