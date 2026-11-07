<?php

return [
    'enabled' => (bool) env('GIT_REPOSITORY_ENABLED', false),
    'repository_url' => env('GIT_REPOSITORY_URL', 'https://github.com/SH4RTH4K/Clinic-System.git'),
    'remote' => env('GIT_REPOSITORY_REMOTE', 'origin'),
    'branch' => env('GIT_REPOSITORY_BRANCH', 'hardening'),
    'repository_type' => env('GIT_REPOSITORY_TYPE', 'public'),
    'authentication' => env('GIT_REPOSITORY_AUTHENTICATION', 'none'),
    'binary' => env('GIT_REPOSITORY_BINARY', 'git'),
    'run_migrations' => (bool) env('GIT_REPOSITORY_RUN_MIGRATIONS', false),
    'clear_cache' => (bool) env('GIT_REPOSITORY_CLEAR_CACHE', true),
    'health_check' => (bool) env('GIT_REPOSITORY_HEALTH_CHECK', true),
];
