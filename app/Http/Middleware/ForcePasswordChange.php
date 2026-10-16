<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForcePasswordChange
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->must_change_password) {
            // Allow routes that are needed to change password
            if (! $request->routeIs('password.*') && ! $request->routeIs('profile.*') && ! $request->routeIs('logout')) {
                return redirect()->route('profile.edit')->with('status', 'Please change your password before continuing.');
            }
        }

        return $next($request);
    }
}
