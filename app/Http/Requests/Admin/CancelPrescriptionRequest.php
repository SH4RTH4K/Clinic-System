<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use App\Models\Visit;
use App\Services\Admin\VisitAuthorizationService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CancelPrescriptionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $visit = $this->route('visit');

        $user = $this->user();

        return $visit instanceof Visit
            && $user instanceof User
            && app(VisitAuthorizationService::class)->canCancelPrescription($user, $visit);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
        ];
    }
}
