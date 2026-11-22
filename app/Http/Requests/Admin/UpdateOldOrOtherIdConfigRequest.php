<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOldOrOtherIdConfigRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && ($user->hasRole('Super Admin') || $user->hasPermissionTo('general_settings.update'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'mode' => ['required', 'string', 'in:auto,manual'],
            'prefix' => ['nullable', 'string', 'max:20'],
            'number_padding' => ['required', 'integer', 'min:0', 'max:10'],
            'allow_staff_override' => ['required', 'boolean'],
            'max_length' => ['required', 'integer', 'min:1', 'max:255'],
        ];
    }
}
