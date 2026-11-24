<?php

namespace App\Http\Controllers;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClinicBrandingController extends Controller
{
    /**
     * Stream the clinic logo if uploaded, or return 404.
     */
    public function logo(): Response
    {
        $settings = ClinicSetting::query()->first();
        $path = $settings?->logo_path;

        if (! is_string($path) || empty($path)) {
            abort(404);
        }

        return $this->streamPublicFile($path, ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
    }

    /**
     * Stream the clinic favicon if uploaded, or return default favicon.
     */
    public function favicon(): Response
    {
        $settings = ClinicSetting::query()->first();
        $path = $settings?->favicon_path;

        if (is_string($path) && ! empty($path)) {
            return $this->streamPublicFile($path, ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml']);
        }

        $defaultFavicon = public_path('favicon.svg');
        if (is_file($defaultFavicon)) {
            return response()->file($defaultFavicon, [
                'Content-Type' => 'image/svg+xml',
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }

        abort(404);
    }

    /**
     * Stream the doctor's signature image.
     */
    public function doctorSignature(Doctor $doctor): Response
    {
        abort_unless($doctor->is_active || request()->user()?->hasRole('Super Admin'), 404);

        $path = $doctor->signature_path;
        if (! is_string($path) || empty($path)) {
            abort(404);
        }

        return $this->streamPublicFile($path, ['image/jpeg', 'image/png', 'image/webp']);
    }

    /**
     * Stream the doctor's official seal/stamp image.
     */
    public function doctorSeal(Doctor $doctor): Response
    {
        abort_unless($doctor->is_active || request()->user()?->hasRole('Super Admin'), 404);

        $path = $doctor->seal_path;
        if (! is_string($path) || empty($path)) {
            abort(404);
        }

        return $this->streamPublicFile($path, ['image/jpeg', 'image/png', 'image/webp']);
    }

    /**
     * Stream a file from the public storage disk with strict validation.
     *
     * @param  list<string>  $allowedMimes
     */
    private function streamPublicFile(string $path, array $allowedMimes): StreamedResponse|BinaryFileResponse
    {
        // Enforce safe relative paths inside allowed branding folders.
        abort_unless(
            preg_match('/\A(branding|doctors)\/[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp|svg|ico)\z/i', $path) === 1,
            404,
        );

        $disk = Storage::disk('public');
        if ($disk->exists($path)) {
            $mimeType = $disk->mimeType($path);
            abort_unless(in_array($mimeType, $allowedMimes, true), 404);

            return $disk->response($path, basename($path), [
                'Cache-Control' => 'private, max-age=600',
                'X-Content-Type-Options' => 'nosniff',
            ], 'inline');
        }

        $legacyPath = realpath(public_path('storage/'.$path));
        $allowedRoot = realpath(public_path('storage'));

        abort_unless(
            is_string($allowedRoot)
                && is_string($legacyPath)
                && is_file($legacyPath)
                && str_starts_with(strtolower($legacyPath), strtolower(rtrim($allowedRoot, '\\/').DIRECTORY_SEPARATOR)),
            404,
        );

        $mimeType = mime_content_type($legacyPath);
        abort_unless(in_array($mimeType, $allowedMimes, true), 404);

        return response()->file($legacyPath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'private, max-age=600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
