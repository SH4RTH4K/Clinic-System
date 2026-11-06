<?php

use Illuminate\Foundation\Application;
use Symfony\Component\Console\Input\ArgvInput;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

define('LARAVEL_START', microtime(true));

$accountRoot = rtrim((string) (getenv('CLINIC_ACCOUNT_ROOT') ?: getenv('HOME')), DIRECTORY_SEPARATOR);
$privatePath = $accountRoot.'/private';
$publicPath = $accountRoot.'/public_html';

if ($accountRoot === '' || ! is_file($privatePath.'/vendor/autoload.php') || ! is_dir($publicPath)) {
    fwrite(STDERR, 'An initialized cPanel installation is required.'.PHP_EOL);
    exit(1);
}

require $privatePath.'/vendor/autoload.php';

/** @var Application $app */
$app = require $privatePath.'/bootstrap/app.php';
$app->usePublicPath($publicPath);

exit($app->handleCommand(new ArgvInput));
