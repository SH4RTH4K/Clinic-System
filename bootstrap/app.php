<?php

use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\ForcePasswordChange;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireClinicalRecordAccess;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\SystemHealthBackupRateLimit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust all proxies — required for shared cPanel hosting where SSL is
        // terminated by the host's proxy before reaching the PHP process.
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            EnsureActiveUser::class,
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'clinical_record_access' => RequireClinicalRecordAccess::class,
            'system_health_backup_rate_limit' => SystemHealthBackupRateLimit::class,
        ]);

        $middleware->appendToGroup('web', [
            ForcePasswordChange::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
