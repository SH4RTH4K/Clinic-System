<?php

namespace App\Providers;

use App\Models\ClinicSetting;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        View::composer(['public.*', 'layouts.public'], fn ($view) => $view->with('settings', ClinicSetting::first()));

        // Global password policy: minimum 12 characters, mixed case, numbers and symbols.
        Password::defaults(fn () => Password::min(12)->mixedCase()->numbers()->symbols());

        // Force HTTPS scheme for all generated URLs in production.
        // Required on shared cPanel hosting where SSL is terminated by the proxy
        // before reaching PHP, so $_SERVER['HTTPS'] may not be set.
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
