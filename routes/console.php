<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\SystemHealthBackupScheduleService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('visit-drafts:prune')->daily();
app(SystemHealthBackupScheduleService::class)->register(Schedule::getFacadeRoot());
