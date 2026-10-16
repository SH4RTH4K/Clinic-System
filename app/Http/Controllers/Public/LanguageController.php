<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LanguageController extends Controller
{
    /**
     * Switch locale and persist in cookie.
     */
    public function switch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => 'required|in:en,bn',
        ]);

        return back()->withCookie(cookie()->forever('locale', $validated['locale']));
    }
}
