<?php

namespace App\Http\Requests\Admin;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Validation\Rule;

class UpdateDoctorRequest extends DoctorFormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && ($user->hasRole('Super Admin') || $user->can('doctors.update'));
    }

    /** @return array<string, array<int, mixed>|string> */
    public function rules(): array
    {
        $rules = $this->doctorRules();

        if ($this->user()?->hasRole('Super Admin')) {
            $doctor = $this->route('doctor');
            $doctorId = $doctor instanceof Doctor ? $doctor->getKey() : null;

            $rules['user_id'] = [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where('is_active', true),
                Rule::unique('doctors', 'user_id')->ignore($doctorId),
            ];
        }

        return $rules;
    }
}
