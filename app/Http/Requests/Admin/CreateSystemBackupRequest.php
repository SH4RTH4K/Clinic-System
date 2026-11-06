<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CreateSystemBackupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin')
            || $this->user()?->can('system_health.manage')
            || false;
    }

    public function rules(): array
    {
        return [
            'backup_type' => ['required', 'string', 'in:database,media,full'],
            'download_after_create' => ['sometimes', 'boolean'],
        ];
    }
}
