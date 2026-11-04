<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Validation\Rule;

class StoreDoctorRequest extends DoctorFormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && ($user->hasRole('Super Admin') || $user->can('doctors.create'));
    }

    /** @return array<string, array<int, mixed>|string> */
    public function rules(): array
    {
        $rules = $this->doctorRules();

        if ($this->user()?->hasRole('Super Admin')) {
            $rules['user_id'] = [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where('is_active', true),
                Rule::unique('doctors', 'user_id'),
            ];
        }

        return $rules;
    }
}
