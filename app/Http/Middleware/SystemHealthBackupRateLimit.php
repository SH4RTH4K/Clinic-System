<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class SystemHealthBackupRateLimit
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response|RedirectResponse
    {
        $key = 'system-health:backup:'.($request->user()?->getAuthIdentifier() ?? 'guest').'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 2)) {
            $seconds = RateLimiter::availableIn($key);

            return back()->with('error', "Backup creation is limited to two requests per minute. Try again in {$seconds} seconds.");
        }

        RateLimiter::hit($key, 60);

        return $next($request);
    }
}
