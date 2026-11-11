<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Private System Backups
    |--------------------------------------------------------------------------
    |
    | On cPanel, set SYSTEM_HEALTH_BACKUP_PATH to an absolute directory owned
    | by the account and outside public_html. Leave it blank to use Laravel's
    | private storage directory.
    |
    */

    'backup_path' => env('SYSTEM_HEALTH_BACKUP_PATH'),

    'backup_retention_days' => (int) env('SYSTEM_HEALTH_BACKUP_RETENTION_DAYS', 14),

    'cpanel_execution_seconds' => (int) env('SYSTEM_HEALTH_CPANEL_EXECUTION_SECONDS', 900),
];
