<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$privatePath = dirname(__DIR__).DIRECTORY_SEPARATOR.'private';

if (file_exists($maintenance = $privatePath.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $privatePath.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $privatePath.'/bootstrap/app.php';
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
