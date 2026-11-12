<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class RestoreSystemBackupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('Super Admin') ?? false;
    }

    public function rules(): array
    {
        return [
            'restore_type' => ['required', 'string', 'in:database,media,full'],
            'restore_mode' => ['nullable', 'string', 'in:empty,overwrite'],
            'backup_filename' => ['nullable', 'required_without:backup_file', 'string', 'regex:/^(database|media|full)-\d{8}-\d{6}-[a-f0-9]{16}\.(?:sql\.gz|zip)$/'],
            'backup_file' => ['nullable', 'required_without:backup_filename', 'file', 'max:2097152'],
            'target_database' => ['required_if:restore_type,database,full', 'nullable', 'string', 'max:64', 'regex:/^(?:[A-Za-z0-9_]{1,64}|:memory:)$/D'],
            'confirmation_phrase' => ['required', 'string', 'in:RESTORE EMPTY TARGET,OVERWRITE EXISTING TARGET'],
        ];
    }

    public function restoreMode(): string
    {
        return $this->input('restore_mode') === 'overwrite' ? 'overwrite' : 'empty';
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $type = $this->input('restore_type');
            $savedFilename = $this->input('backup_filename');
            $uploadedFile = $this->file('backup_file');

            if (is_string($savedFilename) && $uploadedFile instanceof UploadedFile) {
                $validator->errors()->add('backup_filename', 'Choose either a saved backup or an uploaded backup file, not both.');
                $validator->errors()->add('backup_file', 'Choose either a saved backup or an uploaded backup file, not both.');
            }

            if (is_string($type) && is_string($savedFilename) && ! str_starts_with($savedFilename, $type.'-')) {
                $validator->errors()->add('backup_filename', 'Choose a saved backup matching the selected type.');
            }

            $expectedConfirmation = $this->restoreMode() === 'overwrite'
                ? 'OVERWRITE EXISTING TARGET'
                : 'RESTORE EMPTY TARGET';

            if ($this->input('confirmation_phrase') !== $expectedConfirmation) {
                $validator->errors()->add('confirmation_phrase', "Type {$expectedConfirmation} to confirm this restore mode.");
            }

            if (! $uploadedFile instanceof UploadedFile || ! is_string($type)) {
                return;
            }

            $expectedFilenamePattern = match ($type) {
                'database' => '/\.sql\.gz$/iD',
                'media', 'full' => '/\.zip$/iD',
                default => null,
            };

            if ($expectedFilenamePattern === null
                || preg_match($expectedFilenamePattern, basename($uploadedFile->getClientOriginalName())) !== 1) {
                $validator->errors()->add('backup_file', 'Choose a backup file with the correct extension for the selected type. The archive contents will be verified before restore.');
            }

        });
    }
}
