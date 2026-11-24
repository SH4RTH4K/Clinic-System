<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePatientAttachmentRequest;
use App\Models\Patient;
use App\Models\PatientAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PatientAttachmentController extends Controller
{
    /**
     * Store a newly created attachment for a patient.
     */
    public function store(StorePatientAttachmentRequest $request, Patient $patient)
    {
        $validated = $request->validated();
        $file = $request->file('file');

        $fileName = $file->getClientOriginalName();
        $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
        $fileSizeBytes = $file->getSize() ?: 0;

        $path = $file->store("attachments/patient_{$patient->id}", 'public');

        PatientAttachment::create([
            'patient_id' => $patient->id,
            'visit_id' => $validated['visit_id'] ?? null,
            'title' => $validated['title'],
            'category' => $validated['category'],
            'file_path' => $path,
            'file_name' => $fileName,
            'mime_type' => $mimeType,
            'file_size_bytes' => $fileSizeBytes,
            'notes' => $validated['notes'] ?? null,
            'uploaded_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Diagnostic report / file attachment uploaded successfully.');
    }

    /**
     * View the attachment file inline in browser.
     */
    public function show(Request $request, PatientAttachment $attachment)
    {
        abort_unless(
            $request->user()?->can('attachments.view') || $request->user()?->can('clinical_records.view'),
            Response::HTTP_FORBIDDEN,
            'You do not have permission to view patient clinical attachments.'
        );

        if (! Storage::disk('public')->exists($attachment->file_path)) {
            abort(Response::HTTP_NOT_FOUND, 'Attachment file not found on storage.');
        }

        return Storage::disk('public')->response($attachment->file_path, $attachment->file_name, [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => 'inline; filename="'.$attachment->file_name.'"',
        ]);
    }

    /**
     * Download the attachment file.
     */
    public function download(Request $request, PatientAttachment $attachment)
    {
        abort_unless(
            $request->user()?->can('attachments.view') || $request->user()?->can('clinical_records.view'),
            Response::HTTP_FORBIDDEN,
            'You do not have permission to download patient clinical attachments.'
        );

        if (! Storage::disk('public')->exists($attachment->file_path)) {
            abort(Response::HTTP_NOT_FOUND, 'Attachment file not found on storage.');
        }

        return Storage::disk('public')->download($attachment->file_path, $attachment->file_name);
    }

    /**
     * Remove the specified attachment.
     */
    public function destroy(Request $request, PatientAttachment $attachment)
    {
        abort_unless(
            $request->user()?->can('attachments.delete'),
            Response::HTTP_FORBIDDEN,
            'You do not have permission to delete patient clinical attachments.'
        );

        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $attachment->delete();

        return back()->with('success', 'Attachment deleted successfully.');
    }
}
