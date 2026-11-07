<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class UpdateGitRepositorySettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'branch' => ['required', 'string', 'max:100', 'regex:/\A[A-Za-z0-9._\/-]+\z/'],
            'remote' => ['required', 'string', 'max:50', 'regex:/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/'],
            'repository_type' => ['required', 'in:public,private'],
            'repository_url' => ['required', 'string', 'max:255', 'regex:#\A(?:https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?|git@github\.com:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?)\z#i'],
            'authentication' => ['required', 'in:none,personal_access_token,ssh_deploy_key'],
            'credential' => ['nullable', 'string', 'max:10000'],
            'clear_credential' => ['required', 'boolean'],
            'run_migrations' => ['required', 'boolean'],
            'clear_cache' => ['required', 'boolean'],
            'health_check' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'branch.regex' => 'The branch can contain only letters, numbers, dots, underscores, slashes, and hyphens.',
            'remote.regex' => 'The remote name can contain only letters, numbers, dots, underscores, and hyphens.',
            'repository_url.regex' => 'Use a GitHub repository URL without embedded credentials.',
        ];
    }

    protected function failedValidation(Validator $validator): never
    {
        $response = redirect($this->getRedirectUrl())
            ->withInput($this->except(['credential']))
            ->withErrors($validator, $this->errorBag);

        throw (new ValidationException($validator, $response))
            ->errorBag($this->errorBag);
    }
}
