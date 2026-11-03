<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UpdateRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = $this->route('role');

        return $this->user()?->hasRole('Super Admin') === true
            && ($this->user()?->can('roles.update') ?? false)
            && $role instanceof Role
            && $role->name !== 'Super Admin';
    }

    /** @return array<string, array<int, string|ValidationRule>> */
    public function rules(): array
    {
        $role = $this->route('role');

        return [
            'permissions' => ['present', 'array', 'max:100'],
            'permissions.*' => [
                'required',
                'string',
                'distinct:strict',
                Rule::exists('permissions', 'name')->where('guard_name', $role instanceof Role ? $role->guard_name : 'web'),
            ],
        ];
    }
}
