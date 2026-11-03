<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePatientNumberingProfileRequest;
use App\Http\Requests\Admin\UpdatePatientNumberingProfileRequest;
use App\Models\PatientNumberingProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PatientNumberingProfileController extends Controller
{
    public function store(StorePatientNumberingProfileRequest $request): RedirectResponse
    {
        $attributes = $request->validated();
        $this->ensureDefaultProfileIsActive($attributes['is_default'], $attributes['is_active']);
        $this->ensureProfileFormatIsAvailable($attributes);

        DB::transaction(function () use ($attributes): void {
            if ($attributes['is_default']) {
                PatientNumberingProfile::query()->update(['is_default' => false]);
            }

            $profile = PatientNumberingProfile::query()->create([
                ...$attributes,
                'created_by' => Auth::id(),
            ]);

            $profile->sequences()->create([
                'period_key' => $this->periodKey($profile),
                'next_number' => $attributes['starting_number'],
            ]);
        });

        return redirect()->route('admin.general_settings.edit')->with('success', 'Patient numbering option added.');
    }

    public function update(UpdatePatientNumberingProfileRequest $request, PatientNumberingProfile $profile): RedirectResponse
    {
        $attributes = $request->validated();
        $this->ensureDefaultProfileIsActive($attributes['is_default'], $attributes['is_active']);
        $this->ensureProfileFormatIsAvailable($attributes, $profile->id);

        if ($profile->is_active && ! $attributes['is_active'] && PatientNumberingProfile::query()->where('is_active', true)->count() <= 1) {
            throw ValidationException::withMessages([
                'profile' => 'At least one active numbering option is required.',
            ]);
        }

        $wasDefault = $profile->is_default;
        DB::transaction(function () use ($attributes, $profile, $wasDefault): void {
            if ($attributes['is_default']) {
                PatientNumberingProfile::query()->where('id', '!=', $profile->id)->update(['is_default' => false]);
            }

            $profile->update($attributes);

            if ($wasDefault && ! $attributes['is_default']) {
                PatientNumberingProfile::query()
                    ->where('id', '!=', $profile->id)
                    ->where('is_active', true)
                    ->orderBy('id')
                    ->first()
                    ?->update(['is_default' => true]);
            }
        });

        return redirect()->route('admin.general_settings.edit')->with('success', 'Patient numbering option updated.');
    }

    public function destroy(PatientNumberingProfile $profile): RedirectResponse
    {
        if ($profile->is_active && PatientNumberingProfile::query()->where('is_active', true)->count() <= 1) {
            throw ValidationException::withMessages([
                'profile' => 'At least one active numbering option is required.',
            ]);
        }

        $wasDefault = $profile->is_default;
        $profile->update(['is_active' => false, 'is_default' => false]);
        $profile->delete();

        if ($wasDefault) {
            PatientNumberingProfile::query()
                ->where('is_active', true)
                ->orderBy('id')
                ->first()
                ?->update(['is_default' => true]);
        }

        return redirect()->route('admin.general_settings.edit')->with('success', 'Patient numbering option deactivated.');
    }

    private function ensureDefaultProfileIsActive(bool $isDefault, bool $isActive): void
    {
        if ($isDefault && ! $isActive) {
            throw ValidationException::withMessages([
                'is_default' => 'The default numbering option must be active.',
            ]);
        }
    }

    private function periodKey(PatientNumberingProfile $profile): string
    {
        return $profile->reset_annually ? now()->format('Y') : 'all';
    }

    /** @param array<string, mixed> $attributes */
    private function ensureProfileFormatIsAvailable(array $attributes, ?int $exceptProfileId = null): void
    {
        if (! $attributes['is_active']) {
            return;
        }

        $query = PatientNumberingProfile::query()
            ->where('is_active', true)
            ->where('prefix', $attributes['prefix'])
            ->where('include_year', $attributes['include_year'])
            ->where('separator', $attributes['separator']);

        if ($exceptProfileId !== null) {
            $query->where('id', '!=', $exceptProfileId);
        }

        $categoryCode = $attributes['category_code'] ?: null;
        $query->where(function ($categoryQuery) use ($categoryCode): void {
            if ($categoryCode === null) {
                $categoryQuery->whereNull('category_code')->orWhere('category_code', '');
            } else {
                $categoryQuery->where('category_code', $categoryCode);
            }
        });

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'prefix' => 'Another active option already uses this patient ID format. Choose a different prefix or category code.',
            ]);
        }
    }
}
