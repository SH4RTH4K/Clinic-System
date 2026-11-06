<?php

use App\Models\User;
use Database\Seeders\ProductionSetupSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Validation\ValidationException;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

class DeploymentStop extends RuntimeException {}

/** @param array<string, mixed> $state */
function saveInstallationState(string $path, array $state): void
{
    if (file_put_contents($path, json_encode($state, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT).PHP_EOL, LOCK_EX) === false) {
        throw new DeploymentStop('Unable to preserve initialization state.');
    }
    chmod($path, 0600);
}

$phase = 'preflight';
$lock = null;
umask(0077);

try {
    $options = array_slice($argv, 1);
    if (array_diff($options, ['--create-admin', '--activate'])) {
        throw new DeploymentStop('Unsupported initialization option.');
    }
    $createAdmin = in_array('--create-admin', $options, true);
    $activate = in_array('--activate', $options, true);
    $accountRoot = rtrim((string) getenv('HOME'), '/');
    $privatePath = $accountRoot.'/private';
    $publicPath = $accountRoot.'/public_html';
    if ($accountRoot === '' || ! is_file($privatePath.'/FILES_INSTALLED_COMMIT') || ! is_file($privatePath.'/.env')) {
        throw new DeploymentStop('A verified private installation and environment are required.');
    }
    $installedCommit = trim(file_get_contents($privatePath.'/FILES_INSTALLED_COMMIT'));
    if (! preg_match('/^[a-f0-9]{40}$/', $installedCommit)) {
        throw new DeploymentStop('The installed release marker is invalid.');
    }
    $statePath = $privatePath.'/storage/framework/cpanel-initialization.json';
    $lock = fopen($privatePath.'/storage/framework/cpanel-initialization.lock', 'c');
    if ($lock === false || ! flock($lock, LOCK_EX | LOCK_NB)) {
        throw new DeploymentStop('Another initialization is already running.');
    }

    require $privatePath.'/vendor/autoload.php';
    $app = require $privatePath.'/bootstrap/app.php';
    $app->usePublicPath($publicPath);
    $app->make(Kernel::class)->bootstrap();
    if (! $app->environment('production') || $app['config']['app.debug'] !== false) {
        throw new DeploymentStop('Production mode with debug disabled is required.');
    }

    $connection = $app['db']->connection();
    if ($connection->getDriverName() !== 'mysql' || $connection->getDatabaseName() !== 'jbhomio_clinic'
        || ! in_array($connection->getConfig('host'), ['localhost', '127.0.0.1'], true)) {
        throw new DeploymentStop('Only the designated local installation database is allowed.');
    }
    $connection->getPdo();
    $schema = $connection->getSchemaBuilder();
    $state = is_file($statePath) ? json_decode(file_get_contents($statePath), true, 512, JSON_THROW_ON_ERROR) : null;
    if ($state !== null && (($state['database'] ?? null) !== 'jbhomio_clinic' || ($state['release'] ?? null) !== $installedCommit)) {
        throw new DeploymentStop('Initialization state does not match this installation.');
    }
    if ($state !== null && ! in_array($state['phase'] ?? null, ['schema_started', 'schema_ready', 'admin_ready', 'active'], true)) {
        throw new DeploymentStop('Initialization state has an invalid phase.');
    }
    if ($state === null) {
        if (! is_file($privatePath.'/storage/framework/maintenance.php') || $schema->getTables() !== []) {
            throw new DeploymentStop('First initialization requires maintenance mode and an empty database.');
        }
        $state = ['database' => 'jbhomio_clinic', 'release' => $installedCommit, 'phase' => 'schema_started'];
        saveInstallationState($statePath, $state);
    }
    if (($state['phase'] ?? null) !== 'active' && ! is_file($privatePath.'/storage/framework/maintenance.php')) {
        throw new DeploymentStop('Maintenance mode must remain enabled until initialization succeeds.');
    }
    if ($state['phase'] !== 'active' && ! $app->maintenanceMode()->active()) {
        if (Artisan::call('down', ['--retry' => 60, '--no-interaction' => true]) !== 0) {
            throw new DeploymentStop('Unable to establish framework maintenance mode.');
        }
    }

    if ((string) $app['config']['app.key'] === '') {
        if ($activate || $state['phase'] !== 'schema_started') {
            throw new DeploymentStop('An initialized application key must be preserved.');
        }
        if (Artisan::call('key:generate', ['--force' => true, '--no-interaction' => true]) !== 0 || (string) $app['config']['app.key'] === '') {
            throw new DeploymentStop('Application key initialization failed.');
        }
        chmod($privatePath.'/.env', 0600);
    }

    if ($state['phase'] === 'schema_started') {
        $phase = 'database migrations';
        if (Artisan::call('migrate', ['--force' => true, '--no-interaction' => true]) !== 0) {
            throw new DeploymentStop('A migration failed. Maintenance mode remains enabled for review.');
        }
        $migrator = $app->make('migrator');
        $pending = array_diff(array_keys($migrator->getMigrationFiles($app->databasePath('migrations'))), $migrator->getRepository()->getRan());
        if ($pending !== []) {
            throw new DeploymentStop('Pending migrations remain after initialization.');
        }
        foreach (['users', 'roles', 'permissions', 'sessions', 'cache'] as $table) {
            if (! $schema->hasTable($table)) {
                throw new DeploymentStop('A required application table is missing.');
            }
        }
        $state['phase'] = 'schema_ready';
        saveInstallationState($statePath, $state);
    }

    if ($state['phase'] === 'schema_ready') {
        $phase = 'administrator preparation';
        $environmentPath = $privatePath.'/.env';
        $environment = file_get_contents($environmentPath);
        $additions = '';
        foreach (['SETUP_ADMIN_EMAIL', 'SETUP_ADMIN_PASSWORD'] as $setting) {
            if (! preg_match('/^'.preg_quote($setting, '/').'=/m', $environment)) {
                $additions .= $setting.'='.PHP_EOL;
            }
        }
        if ($additions !== '') {
            file_put_contents($environmentPath, PHP_EOL.'# One-time initial administrator setup'.PHP_EOL.$additions, FILE_APPEND | LOCK_EX);
            chmod($environmentPath, 0600);
        }
        if (! $createAdmin) {
            echo 'Database schema initialized successfully. Administrator setup is pending; maintenance remains enabled.'.PHP_EOL;
            exit(0);
        }

        $email = (string) Env::get('SETUP_ADMIN_EMAIL', '');
        $password = (string) Env::get('SETUP_ADMIN_PASSWORD', '');
        if ($email === '' || $password === '') {
            throw new DeploymentStop('Enter the initial administrator email and password in the private setup fields.');
        }
        require_once dirname(__DIR__, 2).'/database/seeders/PatientNumberingProfileSeeder.php';
        require_once dirname(__DIR__, 2).'/database/seeders/ProductionSetupSeeder.php';
        (new ProductionSetupSeeder($email, $password))->run();
        $state['admin_user_id'] = User::query()->where('username', 'superadmin')->value('id');
        $state['phase'] = 'admin_ready';
        saveInstallationState($statePath, $state);
        unset($password);
    }

    if (in_array($state['phase'], ['admin_ready', 'active'], true)) {
        $admin = User::query()->find($state['admin_user_id'] ?? null);
        if (! $admin || ! $admin->is_active || ! $admin->hasRole('Super Admin')) {
            throw new DeploymentStop('The initialized administrator could not be verified.');
        }
        $environmentPath = $privatePath.'/.env';
        $environment = preg_replace('/^SETUP_ADMIN_(?:EMAIL|PASSWORD)=.*(?:\R|$)/m', '', file_get_contents($environmentPath));
        file_put_contents($environmentPath, $environment, LOCK_EX);
        chmod($environmentPath, 0600);
    }

    if ($activate && $state['phase'] === 'admin_ready') {
        $phase = 'activation checks';
        foreach (['config:cache', 'route:cache', 'view:cache'] as $command) {
            if (Artisan::call($command, ['--no-interaction' => true]) !== 0) {
                throw new DeploymentStop('Application cache preparation failed; maintenance remains enabled.');
            }
        }
        $cachedConfiguration = require $app->getCachedConfigPath();
        if (($cachedConfiguration['app']['debug'] ?? true) !== false || empty($cachedConfiguration['app']['key'])) {
            Artisan::call('config:clear', ['--no-interaction' => true]);
            throw new DeploymentStop('Production configuration verification failed.');
        }
        if (Artisan::call('up', ['--no-interaction' => true]) !== 0 || is_file($privatePath.'/storage/framework/maintenance.php')) {
            throw new DeploymentStop('Application activation did not complete.');
        }
        $state['phase'] = 'active';
        saveInstallationState($statePath, $state);
    }
    echo $state['phase'] === 'active' ? 'Clinic application activated successfully.'.PHP_EOL : 'Administrator initialized; maintenance remains enabled.'.PHP_EOL;
} catch (Throwable $exception) {
    $detail = $exception instanceof DeploymentStop ? $exception->getMessage() : get_class($exception).' (code '.preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $exception->getCode()).')';
    if ($exception instanceof ValidationException) {
        $fields = array_intersect(array_keys($exception->errors()), ['email', 'password']);
        $detail = 'Initial administrator validation failed for: '.implode(', ', $fields).'. Use a valid email and a password with at least 16 characters, uppercase and lowercase letters, numbers and symbols.';
    }
    fwrite(STDERR, 'Initialization stopped during '.$phase.': '.$detail.' at '.basename($exception->getFile()).':'.$exception->getLine().PHP_EOL);
    exit(1);
} finally {
    if (is_resource($lock)) {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
