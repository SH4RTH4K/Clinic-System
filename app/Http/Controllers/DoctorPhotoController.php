<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DoctorPhotoController extends Controller
{
    public function showPublic(Doctor $doctor): StreamedResponse
    {
        abort_unless($doctor->is_active, 404);

        return $this->photoResponse($doctor);
    }

    public function showAdmin(Doctor $doctor): StreamedResponse
    {
        return $this->photoResponse($doctor);
    }

    private function photoResponse(Doctor $doctor): StreamedResponse
    {
        $path = $doctor->photo_path;

        abort_unless(
            is_string($path)
                && preg_match('/\Adoctors\/[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)\z/i', $path) === 1,
            404,
        );

        $disk = Storage::disk('public');
        if ($disk->exists($path)) {
            $mimeType = $disk->mimeType($path);
            abort_unless(in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true), 404);

            return $disk->response($path, basename($path), [
                'Cache-Control' => 'private, max-age=300',
                'X-Content-Type-Options' => 'nosniff',
            ], 'inline');
        }

        $legacyRoot = realpath(public_path('storage/doctors'));
        $legacyPath = realpath(public_path('storage/'.$path));

        abort_unless(
            is_string($legacyRoot)
                && is_string($legacyPath)
                && is_file($legacyPath)
                && str_starts_with(
                    strtolower($legacyPath),
                    strtolower(rtrim($legacyRoot, '\\/').DIRECTORY_SEPARATOR),
                ),
            404,
        );

        $mimeType = mime_content_type($legacyPath);
        abort_unless(in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true), 404);

        return response()->stream(
            static function () use ($legacyPath): void {
                readfile($legacyPath);
            },
            200,
            [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="'.basename($legacyPath).'"',
                'Cache-Control' => 'private, max-age=300',
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }
}
