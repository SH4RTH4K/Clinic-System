<?php

use App\Services\SystemHealthBackupScheduleService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('visit-drafts:prune')->daily();
app(SystemHealthBackupScheduleService::class)->register(Schedule::getFacadeRoot());
