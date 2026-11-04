<?php

namespace App\Http\Requests\Admin;

use App\Models\VisitDraft;
use Illuminate\Foundation\Http\FormRequest;

class DeleteVisitDraftRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        $ownerToken = $this->input('owner_token');

        return $user !== null
            && $user->can('clinical_records.view')
            && $user->can('visits.create')
            && is_string($ownerToken)
            && hash_equals(VisitDraft::ownerTokenFor($user), $ownerToken);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'owner_token' => ['required', 'string', 'size:64'],
        ];
    }
}
