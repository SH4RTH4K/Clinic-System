<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DeleteVisitDraftRequest;
use App\Http\Requests\Admin\ShowVisitDraftRequest;
use App\Http\Requests\Admin\StoreVisitDraftRequest;
use App\Models\Patient;
use App\Models\VisitDraft;
use Illuminate\Http\JsonResponse;

class VisitDraftController extends Controller
{
    public function show(ShowVisitDraftRequest $request): JsonResponse
    {
        $user = $request->user();
        VisitDraft::where('user_id', $user->id)->where('expires_at', '<=', now())->delete();

        $savedDraft = VisitDraft::where('user_id', $user->id)
            ->where('expires_at', '>', now())
            ->first();

        if (! $savedDraft) {
            return response()->json(['draft' => null]);
        }

        $payload = $savedDraft->payload;
        unset($payload['doctor_id']);
        $canViewPatients = $user->hasRole('Super Admin') || $user->can('patients.view');
        $patient = null;

        if ($canViewPatients && ! empty($payload['patient_id'])) {
            $patient = Patient::query()
                ->select(['id', 'name', 'patient_no', 'patient_series', 'patient_code', 'gender', 'phone'])
                ->find($payload['patient_id']);
        } elseif (! $canViewPatients) {
            unset(
                $payload['patient_id'],
                $payload['age_at_visit'],
                $payload['age_months'],
                $payload['age_days'],
                $payload['patient_dob'],
            );
        }

        return response()->json([
            'draft' => [
                'payload' => $payload,
                'patient' => $patient,
            ],
        ]);
    }

    public function update(StoreVisitDraftRequest $request): JsonResponse
    {
        VisitDraft::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'payload' => $request->validated('payload'),
                'expires_at' => now()->addDays(7),
            ],
        );

        return response()->json(['saved' => true]);
    }

    public function destroy(DeleteVisitDraftRequest $request): JsonResponse
    {
        VisitDraft::where('user_id', $request->user()->id)->delete();

        return response()->json(null, 204);
    }
}
