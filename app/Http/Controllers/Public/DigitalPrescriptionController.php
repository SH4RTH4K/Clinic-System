<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\ClinicSetting;
use App\Models\Visit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DigitalPrescriptionController extends Controller
{
    /**
     * Display public/patient-facing digital prescription page.
     */
    public function show(string $token): Response
    {
        $visit = Visit::query()
            ->where('share_token', $token)
            ->with([
                'patient:id,name,gender,dob,age_years,age_months,age_days,phone,patient_number',
                'doctor:id,name,name_bn,credentials,credentials_bn,specialty,specialty_bn,govt_reg_no',
                'prescriptionItems.medicine:id,name,common_name,potency',
                'prescriptionItems.pharmaceutical:id,brand_name,generic_name,form,strength',
                'adviceItems:id,text_en,text_bn',
                'foodRestrictions:id,text_en,text_bn',
                'vital',
                'labInvestigations.labInvestigation:id,name,specimen_type',
            ])
            ->firstOrFail();

        abort_unless($visit->status === 'finalized', 404, 'Prescription not found or not finalized.');

        $settings = ClinicSetting::first();
        $practiceType = $settings->practice_type ?? 'homeopathy';

        return Inertia::render('Public/DigitalPrescription', [
            'visit' => $visit,
            'clinic' => [
                'name' => $settings?->clinic_name_en ?: 'RemediQ Clinic',
                'name_bn' => $settings?->clinic_name_bn ?: '',
                'phone' => $settings?->phone ?: '',
                'address' => $settings?->address ?: '',
                'address_bn' => $settings?->address_bn ?: '',
                'logo_path' => $settings?->logo_path,
                'practice_type' => $practiceType,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Download or stream the official prescription PDF for this shared token.
     */
    public function downloadPdf(string $token): HttpResponse
    {
        $visit = Visit::query()
            ->where('share_token', $token)
            ->with([
                'patient',
                'doctor',
                'prescriptionItems.medicine',
                'prescriptionItems.pharmaceutical',
                'adviceItems',
                'foodRestrictions',
                'vital',
                'labInvestigations',
            ])
            ->firstOrFail();

        abort_unless($visit->status === 'finalized', 404, 'Prescription not found or not finalized.');

        $settings = ClinicSetting::first();
        $practiceType = $settings->practice_type ?? 'homeopathy';
        $prescriptionConfig = $settings ? $settings->getPrescriptionConfig() : ClinicSetting::defaultPrescriptionConfig();

        $logoBase64 = null;
        if (! empty($settings?->logo_path) && Storage::disk('public')->exists($settings->logo_path)) {
            $logoContent = Storage::disk('public')->get($settings->logo_path);
            $mime = Storage::disk('public')->mimeType($settings->logo_path);
            $logoBase64 = 'data:'.$mime.';base64,'.base64_encode($logoContent);
        }

        $signatureBase64 = null;
        if (! empty($visit->doctor?->signature_path) && Storage::disk('public')->exists($visit->doctor->signature_path)) {
            $sigContent = Storage::disk('public')->get($visit->doctor->signature_path);
            $mime = Storage::disk('public')->mimeType($visit->doctor->signature_path);
            $signatureBase64 = 'data:'.$mime.';base64,'.base64_encode($sigContent);
        }

        $sealBase64 = null;
        if (! empty($visit->doctor?->seal_path) && Storage::disk('public')->exists($visit->doctor->seal_path)) {
            $sealContent = Storage::disk('public')->get($visit->doctor->seal_path);
            $mime = Storage::disk('public')->mimeType($visit->doctor->seal_path);
            $sealBase64 = 'data:'.$mime.';base64,'.base64_encode($sealContent);
        }

        $pdf = Pdf::loadView('pdf.prescription', [
            'visit' => $visit,
            'vital' => $visit->vital,
            'settings' => $settings,
            'practiceType' => $practiceType,
            'prescriptionConfig' => $prescriptionConfig,
            'isPrePrinted' => false,
            'logoBase64' => $logoBase64,
            'signatureBase64' => $signatureBase64,
            'sealBase64' => $sealBase64,
        ]);

        return $pdf->download('Prescription-'.($visit->patient?->name ? str_replace(' ', '_', $visit->patient->name) : 'Patient').'-'.$visit->id.'.pdf');
    }
}
