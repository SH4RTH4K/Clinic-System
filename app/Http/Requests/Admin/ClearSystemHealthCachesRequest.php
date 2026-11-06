<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ClearSystemHealthCachesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin')
            || $this->user()?->can('system_health.manage')
            || false;
    }

    public function rules(): array
    {
        return [];
    }
}
