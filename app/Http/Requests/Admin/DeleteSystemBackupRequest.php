<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class DeleteSystemBackupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin') ?? false;
    }

    public function rules(): array
    {
        return [
            'filename' => [
                'required',
                'string',
                'regex:/^(database|media|full|cpanel)-\d{8}-\d{6}-[a-f0-9]{16}\.(?:sql\.gz|zip)$/D',
            ],
        ];
    }

    /**
     * Include the route filename in validated request data.
     *
     * @return array<string, mixed>
     */
    public function validationData(): array
    {
        return array_merge(parent::validationData(), [
            'filename' => $this->route('filename'),
        ]);
    }
}
