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
        abort_unless($disk->exists($path), 404);

        $mimeType = $disk->mimeType($path);
        abort_unless(in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true), 404);

        return $disk->response($path, basename($path), [
            'Cache-Control' => 'private, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }
}
