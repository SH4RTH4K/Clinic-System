<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use App\Models\Visit;
use App\Services\Admin\VisitAuthorizationService;

class FinalizeVisitRequest extends StoreVisitRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $visit = $this->route('visit');

        if (! $user instanceof User) {
            return false;
        }

        if ($visit instanceof Visit) {
            return app(VisitAuthorizationService::class)->canFinalizeDraft($user, $visit);
        }

        return app(VisitAuthorizationService::class)->canFinalizeNewVisit($user);
    }

    public function rules(): array
    {
        $rules = parent::rules();
        $rules['doctor_id'] = ['prohibited'];

        return $rules;
    }
}
