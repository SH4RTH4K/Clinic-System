<?php

namespace App\Http\Requests\Admin;

use App\Models\AppointmentRequest as AppointmentRequestModel;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppointmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && ($user->hasRole('Super Admin') || $user->can('appointments.update'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['pending', 'contacted', 'scheduled', 'cancelled'])],
            'scheduled_date' => [
                'nullable',
                'required_if:status,scheduled',
                'required_with:scheduled_time',
                'date',
                Rule::when($this->input('status') === 'scheduled', ['after_or_equal:today']),
            ],
            'scheduled_time' => [
                'nullable',
                'required_if:status,scheduled',
                'required_with:scheduled_date',
                'date_format:H:i',
            ],
            'reason' => [
                'nullable',
                'string',
                'max:1000',
                Rule::requiredIf(fn (): bool => $this->isRescheduling()),
            ],
        ];
    }

    private function isRescheduling(): bool
    {
        $appointmentRequest = $this->route('appointmentRequest');

        if (! $appointmentRequest instanceof AppointmentRequestModel || $appointmentRequest->status !== 'scheduled') {
            return false;
        }

        $submittedDate = $this->input('scheduled_date');
        $submittedTime = $this->input('scheduled_time');
        $currentDate = $appointmentRequest->scheduled_date?->toDateString();
        $currentTime = $appointmentRequest->scheduled_time === null
            ? null
            : substr((string) $appointmentRequest->scheduled_time, 0, 5);

        if (! is_string($submittedDate)) {
            $submittedDate = null;
        }

        if (! is_string($submittedTime)) {
            $submittedTime = null;
        } elseif ($submittedTime !== '') {
            $submittedTime = substr($submittedTime, 0, 5);
        }

        return $submittedDate !== $currentDate || $submittedTime !== $currentTime;
    }
}
