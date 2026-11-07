<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Process;

class GitRepositoryService
{
    private const SETTINGS_PATH = 'system/git-repository/settings.json';

    private const HISTORY_PATH = 'system/git-repository/history.json';

    /** @var array{enabled: bool, branch: string, repository_type: string, repository_url: string, remote: string, authentication: string, credential: ?string, valid: bool}|null */
    private ?array $storedSettings = null;

    /**
     * Return repository metadata without fetching or modifying the checkout.
     *
     * @return array<string, mixed>
     */
    public function snapshot(): array
    {
        $settings = $this->settings();
        $snapshot = [
            'enabled' => false,
            'status' => 'Disabled',
            'message' => 'Git operations are disabled for this environment.',
            'environment' => app()->environment(),
            'branch' => $settings['branch'],
            'repository_url' => $settings['repository_url'],
            'local_commit' => null,
            'remote_commit' => null,
            'incoming_commits' => 0,
            'incoming_commit_details' => [],
            'working_tree_changes' => 0,
            'working_tree_paths' => [],
            'pull_available' => false,
            'deploy_available' => false,
        ];

        if (! $settings['valid']) {
            $snapshot['status'] = 'Unavailable';
            $snapshot['message'] = 'Repository settings are unreadable. Review the private settings file before enabling Git operations.';

            return $snapshot;
        }

        if (! $this->operationsEnabled()) {
            $snapshot['message'] = $this->unavailableMessage();

            return $snapshot;
        }

        $snapshot['enabled'] = true;

        try {
            if (! $this->repositoryExists()) {
                $snapshot['status'] = 'Not connected';
                $snapshot['message'] = 'Save repository settings to initialize Git metadata without replacing deployed files.';

                return $snapshot;
            }

            $this->assertRepositoryReady();
            $this->assertConfiguredRemote();

            $currentBranch = trim($this->runGit(['branch', '--show-current']));
            $snapshot['local_commit'] = trim($this->runGit(['rev-parse', 'HEAD']));
            $changes = $this->workingTreeChanges();
            $snapshot['working_tree_changes'] = count($changes);
            $snapshot['working_tree_paths'] = array_map(static fn (string $change): string => trim(substr($change, 3)), $changes);

            if ($currentBranch !== $settings['branch']) {
                $snapshot['status'] = 'Wrong branch';
                $snapshot['message'] = 'The deployed checkout is not on the configured branch.';

                return $snapshot;
            }

            $remoteRef = $this->remoteBranch();
            if ($remoteRef === null) {
                $snapshot['status'] = 'Not checked';
                $snapshot['message'] = 'Check the repository to load the latest remote commit.';

                return $snapshot;
            }

            $snapshot['remote_commit'] = $remoteRef;
            $incomingCount = (int) trim($this->runGit(['rev-list', '--count', 'HEAD..'.$this->remoteTrackingBranch()]));
            $snapshot['incoming_commits'] = $incomingCount;
            $snapshot['incoming_commit_details'] = $incomingCount > 0 ? $this->commitList('HEAD..'.$this->remoteTrackingBranch()) : [];

            if ($changes !== []) {
                $snapshot['status'] = 'Local changes detected';
                $snapshot['message'] = 'Pull is blocked until the deployed checkout has no local or untracked changes.';

                return $snapshot;
            }

            if ((int) trim($this->runGit(['rev-list', '--count', $this->remoteTrackingBranch().'..HEAD'])) > 0) {
                $snapshot['status'] = 'Branches diverged';
                $snapshot['message'] = 'The deployed branch contains commits that are not on the configured remote branch.';

                return $snapshot;
            }

            $snapshot['status'] = $incomingCount > 0 ? 'Update available' : 'Up to date';
            $snapshot['message'] = $incomingCount > 0
                ? $incomingCount.' fast-forward update(s) are available.'
                : 'The deployed checkout is up to date.';
            $snapshot['deploy_available'] = $incomingCount > 0 && $this->incomingChangesAreSafe();
            $snapshot['pull_available'] = $snapshot['deploy_available'];

            if ($incomingCount > 0 && ! $snapshot['deploy_available']) {
                $snapshot['message'] = 'This update is blocked by a safety check. Review local changes, protected paths, migration settings, and compiled frontend assets before deploying.';
            }
        } catch (RuntimeException) {
            $snapshot['status'] = 'Unavailable';
            $snapshot['message'] = $this->unavailableMessage();
        }

        return $snapshot;
    }

    /** @return array<string, mixed> */
    public function check(): array
    {
        $this->assertOperationsAllowed();
        $this->assertRepositoryReady();
        $this->assertConfiguredRemote();

        $this->runGit([
            'fetch',
            '--no-tags',
            '--no-recurse-submodules',
            '--',
            $this->repositoryUrl(),
            '+refs/heads/'.$this->branch().':refs/remotes/'.$this->remote().'/'.$this->branch(),
        ], $this->authenticationEnvironment());

        return $this->snapshot();
    }

    /** @return array{enabled: bool, branch: string, repository_type: string, repository_url: string, remote: string, authentication: string, has_credential: bool, run_migrations: bool, clear_cache: bool, health_check: bool, can_configure: bool, configuration_message: ?string} */
    public function settingsForPage(): array
    {
        $settings = $this->settings();

        return [
            'enabled' => $settings['enabled'] && $this->canConfigure(),
            'branch' => $settings['branch'],
            'repository_type' => $settings['repository_type'],
            'repository_url' => $settings['repository_url'],
            'remote' => $settings['remote'],
            'authentication' => $settings['authentication'],
            'has_credential' => $settings['credential'] !== null,
            'run_migrations' => $settings['run_migrations'],
            'clear_cache' => $settings['clear_cache'],
            'health_check' => $settings['health_check'],
            'can_configure' => $this->canConfigure(),
            'configuration_message' => $this->configurationMessage(),
        ];
    }

    /** @return array<string, mixed> */
    public function historyForPage(): array
    {
        $disk = Storage::disk('local');
        $path = $disk->path(self::HISTORY_PATH);

        if (is_link(dirname($path)) || is_link($path) || ! is_file($path) || filesize($path) > 65536) {
            return [];
        }

        try {
            $history = json_decode($disk->get(self::HISTORY_PATH), true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return [];
        }

        if (! is_array($history)) {
            return [];
        }

        $validHistory = array_values(array_filter(array_slice($history, 0, 20), static fn (mixed $entry): bool => is_array($entry)
            && in_array($entry['status'] ?? null, ['completed', 'failed'], true)
            && is_string($entry['branch'] ?? null)
            && is_string($entry['previous_commit'] ?? null)
            && preg_match('/\A[a-f0-9]{7,40}\z/i', $entry['previous_commit']) === 1
            && (is_null($entry['target_commit'] ?? null) || (is_string($entry['target_commit']) && preg_match('/\A[a-f0-9]{7,40}\z/i', $entry['target_commit']) === 1))
            && is_int($entry['commits_applied'] ?? null)
            && is_string($entry['finished_at'] ?? null)
        ));

        return array_map(static fn (array $entry): array => [
            ...$entry,
            'change' => is_string($entry['change'] ?? null) ? $entry['change'] : 'Fast-forward backend update',
            'checks' => is_array($entry['checks'] ?? null)
                ? array_values(array_filter($entry['checks'], static fn (mixed $check): bool => is_string($check) && strlen($check) <= 120))
                : [],
        ], $validHistory);
    }

    /** @param array{enabled: bool, branch: string, remote: string, repository_type: string, repository_url: string, authentication: string, credential: ?string, clear_credential: bool, run_migrations: bool, clear_cache: bool, health_check: bool} $settings */
    public function saveSettings(array $settings): void
    {
        if (! $this->supportsGitActions()) {
            throw new RuntimeException('Git settings and actions are disabled in the automated testing environment.');
        }

        if (! function_exists('proc_open')) {
            throw new RuntimeException('The PHP runtime does not allow launching Git processes.');
        }

        $branchCheck = $this->executeGit(['check-ref-format', '--branch', $settings['branch']]);
        if ($branchCheck['code'] !== 0) {
            throw new RuntimeException('The configured Git branch name is invalid.');
        }

        if (! preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/', $settings['remote'])) {
            throw new RuntimeException('The configured Git remote name is invalid.');
        }

        if ($settings['repository_type'] === 'private' && ! in_array($settings['authentication'], ['personal_access_token', 'ssh_deploy_key'], true)) {
            throw new RuntimeException('Private GitHub repositories require a personal access token or SSH deploy key.');
        }

        if ($settings['authentication'] === 'none' && $settings['repository_type'] === 'private') {
            throw new RuntimeException('Choose token authentication for a private repository.');
        }

        $existing = $this->settings();
        $credential = $settings['authentication'] === 'none' || $settings['clear_credential']
            ? null
            : ($settings['credential'] !== null && $settings['credential'] !== ''
                ? $settings['credential']
                : $existing['credential']);

        if ($settings['authentication'] === 'personal_access_token' && $credential === null) {
            throw new RuntimeException('Enter a personal access token before saving this authentication method.');
        }

        if ($settings['authentication'] === 'ssh_deploy_key' && ($credential === null || preg_match('#\Agit@github\.com:#i', $settings['repository_url']) !== 1)) {
            throw new RuntimeException('SSH deploy-key authentication requires a key and a git@github.com repository URL.');
        }

        if ($settings['enabled']) {
            if ($this->repositoryExists()) {
                $this->assertRepositoryReady();
                $this->assertConfiguredRemote($settings);
            } else {
                $this->initializeRepository($settings, $credential);
            }
        }

        $this->writeSettings([
            'enabled' => (bool) $settings['enabled'],
            'branch' => $settings['branch'],
            'repository_type' => $settings['repository_type'],
            'repository_url' => $settings['repository_url'],
            'remote' => $settings['remote'],
            'authentication' => $settings['authentication'],
            'credential' => $credential,
            'run_migrations' => (bool) $settings['run_migrations'],
            'clear_cache' => (bool) $settings['clear_cache'],
            'health_check' => (bool) $settings['health_check'],
        ]);
    }

    /** @return array<string, mixed> */
    public function pull(): array
    {
        $this->assertOperationsAllowed();
        $this->assertRepositoryReady();

        $lockPath = storage_path('app/git-repository.lock');
        File::ensureDirectoryExists(dirname($lockPath));
        $lock = fopen($lockPath, 'c');

        if ($lock === false || ! flock($lock, LOCK_EX | LOCK_NB)) {
            if (is_resource($lock)) {
                fclose($lock);
            }

            throw new RuntimeException('Another repository update is already in progress.');
        }

        try {
            $previousCommit = trim($this->runGit(['rev-parse', 'HEAD']));
            $targetCommit = null;
            $commitsApplied = 0;

            try {
                $snapshot = $this->check();
                $targetCommit = $snapshot['remote_commit'];
                $commitsApplied = (int) $snapshot['incoming_commits'];
                $incomingMigrations = $this->incomingChangesContainMigrations();

                if ($snapshot['status'] !== 'Update available' || ! $snapshot['deploy_available']) {
                    throw new RuntimeException((string) $snapshot['message']);
                }

                $this->runGit(['merge', '--ff-only', $this->remoteTrackingBranch()]);
                $checks = ['Clean tracked checkout', 'Untracked files preserved', 'Approved GitHub URL', 'Fast-forward only'];

                if ($incomingMigrations && $this->settings()['run_migrations']) {
                    $this->runArtisan(['migrate', '--force']);
                    $checks[] = 'Forward migrations completed';
                }

                if ($this->settings()['clear_cache']) {
                    $this->runArtisan(['optimize:clear']);
                    $checks[] = 'Application caches cleared';
                }

                if ($this->settings()['health_check']) {
                    $this->healthCheck();
                    $checks[] = 'Database health check passed';
                }

                $this->recordHistory([
                    'status' => 'completed',
                    'branch' => $this->branch(),
                    'previous_commit' => $previousCommit,
                    'target_commit' => (string) $targetCommit,
                    'commits_applied' => $commitsApplied,
                    'change' => 'Fast-forward repository update',
                    'checks' => $checks,
                    'finished_at' => now()->toISOString(),
                ]);

                return $this->snapshot();
            } catch (\Throwable $exception) {
                $this->recordHistory([
                    'status' => 'failed',
                    'branch' => $this->branch(),
                    'previous_commit' => $previousCommit,
                    'target_commit' => is_string($targetCommit) ? $targetCommit : null,
                    'commits_applied' => $commitsApplied,
                    'change' => 'Update attempt stopped safely',
                    'checks' => ['The requested update did not complete'],
                    'finished_at' => now()->toISOString(),
                ]);

                throw $exception;
            }
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function operationsEnabled(): bool
    {
        return $this->supportsGitActions()
            && $this->settings()['valid']
            && $this->settings()['enabled']
            && function_exists('proc_open');
    }

    private function assertOperationsAllowed(): void
    {
        if (! $this->supportsGitActions()) {
            throw new RuntimeException('Git settings and actions are disabled in the automated testing environment.');
        }

        if (! $this->settings()['valid'] || ! $this->settings()['enabled']) {
            throw new RuntimeException('Enable the Git integration in Repository settings before using it.');
        }

        if (! function_exists('proc_open')) {
            throw new RuntimeException('The PHP runtime does not permit launching the Git process.');
        }
    }

    private function assertRepositoryReady(): void
    {
        if (! file_exists(base_path('.git')) || is_link(base_path('.git'))) {
            throw new RuntimeException('This deployed installation is not a full Git checkout.');
        }

        $root = realpath(trim($this->runGit(['rev-parse', '--show-toplevel'])));
        $applicationRoot = realpath(base_path());

        if ($root === false || $applicationRoot === false || $root !== $applicationRoot) {
            throw new RuntimeException('Git repository root does not match the Laravel application directory.');
        }
    }

    private function repositoryExists(): bool
    {
        return file_exists(base_path('.git'));
    }

    /** @param array<string, mixed> $settings */
    private function initializeRepository(array $settings, ?string $credential): void
    {
        $gitPath = base_path('.git');

        if (file_exists($gitPath) || is_link($gitPath)) {
            throw new RuntimeException('Existing Git metadata could not be safely verified.');
        }

        $this->runGit(['init', '--quiet']);

        try {
            $this->runGit(['remote', 'add', $settings['remote'], $settings['repository_url']]);
            $this->runGit([
                'fetch', '--no-tags', '--no-recurse-submodules', '--', $settings['repository_url'],
                '+refs/heads/'.$settings['branch'].':refs/remotes/'.$settings['remote'].'/'.$settings['branch'],
            ], $this->authenticationEnvironmentFor($settings['authentication'], $credential));
            $trackingRef = 'refs/remotes/'.$settings['remote'].'/'.$settings['branch'];
            $this->runGit(['branch', '--force', $settings['branch'], $trackingRef]);
            $this->runGit(['symbolic-ref', 'HEAD', 'refs/heads/'.$settings['branch']]);
            $this->runGit(['reset', '--mixed', $trackingRef]);
            $this->assertRepositoryReady();
            $this->assertConfiguredRemote($settings);
        } catch (\Throwable) {
            throw new RuntimeException('Git metadata setup failed without checking out or replacing application files. Review server Git support and repository settings before retrying.');
        }
    }

    /** @param array{remote: string, branch: string, repository_url: string} $settings */
    private function assertConfiguredRemote(?array $settings = null): void
    {
        $settings ??= $this->settings();
        $remote = $settings['remote'];
        $branch = $settings['branch'];

        if (! preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/', $remote)) {
            throw new RuntimeException('The configured Git remote name is invalid.');
        }

        $branchCheck = $this->executeGit(['check-ref-format', '--branch', $branch]);
        if ($branchCheck['code'] !== 0 || $branch === '') {
            throw new RuntimeException('The configured Git branch name is invalid.');
        }

        $remoteUrl = trim($this->runGit(['remote', 'get-url', $remote]));

        if ($this->normalizeRepositoryUrl($remoteUrl) !== $this->normalizeRepositoryUrl($settings['repository_url'])) {
            throw new RuntimeException('The configured Git remote does not match the approved Clinic repository.');
        }
    }

    private function normalizeRepositoryUrl(string $url): string
    {
        $url = strtolower(trim($url));
        $url = preg_replace('#^git@github\.com:#', 'https://github.com/', $url) ?? $url;

        return preg_replace('/\.git$/', '', rtrim($url, '/')) ?? $url;
    }

    private function remoteTrackingBranch(): string
    {
        return $this->remote().'/'.$this->branch();
    }

    private function remoteBranch(): ?string
    {
        $result = $this->executeGit(['rev-parse', '--verify', $this->remoteTrackingBranch()]);

        return $result['code'] === 0 ? trim($result['output']) : null;
    }

    /** @return list<string> */
    private function workingTreeChanges(): array
    {
        $output = $this->runGit(['status', '--porcelain', '--untracked-files=no']);

        return array_values(array_filter(preg_split('/\R/', trim($output)) ?: []));
    }

    private function incomingChangesAreSafe(): bool
    {
        $output = $this->runGit(['diff', '--name-status', '--no-renames', 'HEAD', $this->remoteTrackingBranch()]);
        $changes = array_values(array_filter(preg_split('/\R/', trim($output)) ?: []));

        if ($changes === []) {
            return false;
        }

        foreach ($changes as $change) {
            $parts = explode("\t", $change, 2);
            if (count($parts) !== 2 || ! in_array($parts[0], ['A', 'M', 'D'], true)) {
                return false;
            }

            $path = $parts[1];
            if ($this->isProtectedDeploymentPath($path)) {
                return false;
            }
        }

        $rawChanges = $this->runGit(['diff', '--raw', '--no-renames', 'HEAD', $this->remoteTrackingBranch()]);
        foreach (array_filter(preg_split('/\R/', trim($rawChanges)) ?: []) as $rawChange) {
            if (preg_match('/\A:([0-7]{6}) ([0-7]{6}) [a-f0-9]+ [a-f0-9]+ ([A-Z])\t.+\z/i', $rawChange, $matches) !== 1) {
                return false;
            }

            $newMode = $matches[2];
            $status = $matches[3];
            if (($status === 'D' && $newMode !== '000000') || ($status !== 'D' && ! in_array($newMode, ['100644', '100755'], true))) {
                return false;
            }
        }

        return $this->incomingFrontendBuildIsValid()
            && (! $this->incomingChangesContainMigrations()
                || ($this->settings()['run_migrations'] && $this->incomingMigrationsAreForwardOnly()));
    }

    private function incomingFrontendBuildIsValid(): bool
    {
        $changedPaths = preg_split('/\R/', trim($this->runGit([
            'diff', '--name-only', 'HEAD', $this->remoteTrackingBranch(), '--',
            'resources/js', 'resources/css', 'vite.config.js', 'package.json', 'package-lock.json',
        ]))) ?: [];

        if ($changedPaths === []) {
            return true;
        }

        $manifestPath = 'public/build/manifest.json';
        $manifestChanges = preg_split('/\R/', trim($this->runGit([
            'diff', '--name-only', 'HEAD', $this->remoteTrackingBranch(), '--', $manifestPath,
        ]))) ?: [];

        if (! in_array($manifestPath, $manifestChanges, true)) {
            return false;
        }

        $manifestResult = $this->executeGit(['show', $this->remoteTrackingBranch().':'.$manifestPath]);
        if ($manifestResult['code'] !== 0) {
            return false;
        }

        try {
            $manifest = json_decode($manifestResult['output'], true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return false;
        }

        if (! is_array($manifest) || $manifest === []) {
            return false;
        }

        foreach ($manifest as $entry) {
            if (! is_array($entry)) {
                return false;
            }

            $assets = array_filter(array_merge(
                [is_string($entry['file'] ?? null) ? $entry['file'] : null],
                is_array($entry['css'] ?? null) ? $entry['css'] : [],
                is_array($entry['assets'] ?? null) ? $entry['assets'] : [],
            ), static fn (mixed $asset): bool => is_string($asset));

            foreach ($assets as $asset) {
                if (str_contains($asset, '..') || str_starts_with($asset, '/')) {
                    return false;
                }

                if ($this->executeGit(['cat-file', '-e', $this->remoteTrackingBranch().':public/build/'.$asset])['code'] !== 0) {
                    return false;
                }
            }
        }

        return true;
    }

    private function isProtectedDeploymentPath(string $path): bool
    {
        $normalized = strtolower(str_replace('\\', '/', ltrim($path, '/')));
        $basename = basename($normalized);

        foreach (['.env', '.git/', 'storage/', 'public/storage/', 'bootstrap/cache/', 'vendor/', 'node_modules/'] as $protected) {
            if ($normalized === rtrim($protected, '/') || str_starts_with($normalized, $protected)) {
                return true;
            }
        }

        if (str_starts_with($basename, '.env') && ! in_array($basename, ['.env.example', '.env.production.example'], true)) {
            return true;
        }

        return str_ends_with($normalized, '.sqlite')
            || str_ends_with($normalized, '.sql')
            || in_array(pathinfo($basename, PATHINFO_EXTENSION), ['pem', 'key', 'p12', 'pfx'], true);
    }

    private function incomingChangesContainMigrations(): bool
    {
        $output = $this->runGit(['diff', '--name-only', 'HEAD', $this->remoteTrackingBranch(), '--', 'database/migrations']);

        return trim($output) !== '';
    }

    private function incomingMigrationsAreForwardOnly(): bool
    {
        $output = $this->runGit(['diff', '--name-status', '--no-renames', 'HEAD', $this->remoteTrackingBranch(), '--', 'database/migrations']);
        $changes = array_values(array_filter(preg_split('/\R/', trim($output)) ?: []));

        if ($changes === []) {
            return false;
        }

        foreach ($changes as $change) {
            $parts = explode("\t", $change, 2);
            if (count($parts) !== 2 || $parts[0] !== 'A' || ! str_ends_with($parts[1], '.php')) {
                return false;
            }
        }

        return true;
    }

    /** @param list<string> $arguments */
    private function runArtisan(array $arguments): void
    {
        $process = new Process(array_merge([PHP_BINARY, base_path('artisan')], $arguments), base_path(), [
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'DB_URL' => '',
        ], null, 300);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('A configured post-deploy Artisan operation failed; inspect protected server logs before another deployment attempt.');
        }
    }

    private function healthCheck(): void
    {
        try {
            DB::connection()->select('SELECT 1');
        } catch (\Throwable) {
            throw new RuntimeException('The configured post-deploy database health check failed.');
        }
    }

    /**
     * @param  list<string>  $arguments
     * @return array{code: int, output: string, error: string}
     */
    /** @param list<string> $arguments
     * @param  array<string, string|null>  $environment
     */
    private function executeGit(array $arguments, array $environment = []): array
    {
        $binary = trim((string) config('git_repository.binary', 'git'));
        $temporaryKeyPath = $environment['CLINIC_GIT_TEMP_KEY_PATH'] ?? null;
        unset($environment['CLINIC_GIT_TEMP_KEY_PATH']);

        if ($binary === '') {
            throw new RuntimeException('A Git executable is not configured.');
        }

        try {
            $process = new Process(array_merge([
                $binary,
                '-c', 'core.hooksPath=/dev/null',
                '-c', 'credential.helper=',
            ], $arguments), base_path(), array_merge([
                'GIT_TERMINAL_PROMPT' => '0',
                'GIT_CONFIG_NOSYSTEM' => '1',
                'GIT_CONFIG_GLOBAL' => '/dev/null',
                'GIT_OPTIONAL_LOCKS' => '0',
                'GIT_DIR' => null,
                'GIT_WORK_TREE' => null,
                'GIT_INDEX_FILE' => null,
                'GIT_CONFIG' => null,
                'GIT_CONFIG_PARAMETERS' => null,
                'GIT_CONFIG_COUNT' => null,
                'GIT_CONFIG_KEY_0' => null,
                'GIT_CONFIG_VALUE_0' => null,
            ], $environment), null, 60);
            $process->run();

            return [
                'code' => $process->getExitCode() ?? 1,
                'output' => trim($process->getOutput()),
                'error' => trim($process->getErrorOutput()),
            ];
        } catch (\Throwable) {
            throw new RuntimeException('The Git executable could not be started.');
        } finally {
            $privateKeyDirectory = realpath(storage_path('app/private/git-repository'));
            if (is_string($temporaryKeyPath)
                && $privateKeyDirectory !== false
                && str_starts_with($temporaryKeyPath, $privateKeyDirectory.DIRECTORY_SEPARATOR)
                && is_file($temporaryKeyPath)
                && ! is_link($temporaryKeyPath)) {
                unlink($temporaryKeyPath);
            }
        }
    }

    /** @param list<string> $arguments */
    /** @param list<string> $arguments
     * @param  array<string, string|null>  $environment
     */
    private function runGit(array $arguments, array $environment = []): string
    {
        $result = $this->executeGit($arguments, $environment);

        if ($result['code'] !== 0) {
            throw new RuntimeException($this->gitFailureMessage($arguments, $result));
        }

        return $result['output'];
    }

    /** @param list<string> $arguments
     * @param  array{code: int, output: string, error: string}  $result
     */
    private function gitFailureMessage(array $arguments, array $result): string
    {
        $diagnostic = strtolower($result['error'].' '.$result['output']);
        $operation = match ($arguments[0] ?? '') {
            'fetch' => 'GitHub connection check',
            'remote' => 'Repository configuration check',
            'rev-parse' => 'Git checkout check',
            default => 'Git operation',
        };

        $reason = match (true) {
            str_contains($diagnostic, 'ssl certificate problem'),
            str_contains($diagnostic, 'certificate verify failed') => 'The server could not validate GitHub’s HTTPS certificate. Ask the hosting provider to check its CA certificates.',
            str_contains($diagnostic, 'couldn’t find remote ref'),
            str_contains($diagnostic, "couldn't find remote ref"),
            str_contains($diagnostic, 'remote branch') && str_contains($diagnostic, 'not found') => 'The configured branch was not found on GitHub. Verify the branch name.',
            str_contains($diagnostic, 'repository not found'),
            str_contains($diagnostic, 'authentication failed'),
            str_contains($diagnostic, 'could not read username') => 'GitHub did not allow access to this repository. Verify its visibility and authentication settings.',
            str_contains($diagnostic, 'could not resolve host'),
            str_contains($diagnostic, 'failed to connect'),
            str_contains($diagnostic, 'connection timed out'),
            str_contains($diagnostic, 'network is unreachable') => 'The server could not reach GitHub. Check outbound HTTPS and DNS access on this host.',
            str_contains($diagnostic, 'dubious ownership'),
            str_contains($diagnostic, 'safe.directory') => 'Git rejected the checkout directory. Ask the hosting provider to verify its ownership and safe-directory configuration.',
            str_contains($diagnostic, 'permission denied'),
            str_contains($diagnostic, 'could not lock'),
            str_contains($diagnostic, 'access is denied') => 'The server could not access Git metadata. Check the application files’ ownership and permissions.',
            ($arguments[0] ?? '') === 'rev-parse' => 'The application directory is not a readable Git checkout. A ZIP deployment or incomplete .git metadata can cause this. Ask the hosting administrator to verify or restore the full Git metadata; this page will not replace it.',
            default => 'Check GitHub access, the configured branch, and server Git permissions. No application files were updated.',
        };

        return $operation.' failed. '.$reason;
    }

    private function unavailableMessage(): string
    {
        if (! $this->supportsGitActions()) {
            return 'Repository operations are intentionally disabled in the automated testing environment.';
        }

        if (! $this->settings()['valid'] || ! $this->settings()['enabled']) {
            return 'Repository operations are disabled. Enable them from Repository settings in production.';
        }

        if (! function_exists('proc_open')) {
            return 'The PHP runtime cannot launch Git. Ask the hosting administrator whether process execution is available.';
        }

        if (! $this->repositoryExists()) {
            return 'Save enabled repository settings to initialize Git metadata without replacing deployed files.';
        }

        return 'The Git checkout, remote, or configured branch could not be verified.';
    }

    /** @return array{enabled: bool, branch: string, repository_type: string, repository_url: string, remote: string, authentication: string, credential: ?string, run_migrations: bool, clear_cache: bool, health_check: bool, valid: bool} */
    private function settings(): array
    {
        if ($this->storedSettings !== null) {
            return $this->storedSettings;
        }

        $defaults = [
            'enabled' => (bool) config('git_repository.enabled'),
            'branch' => (string) config('git_repository.branch', 'hardening'),
            'repository_type' => (string) config('git_repository.repository_type', 'public'),
            'repository_url' => (string) config('git_repository.repository_url'),
            'remote' => (string) config('git_repository.remote', 'origin'),
            'authentication' => (string) config('git_repository.authentication', 'none'),
            'credential' => null,
            'run_migrations' => (bool) config('git_repository.run_migrations', false),
            'clear_cache' => (bool) config('git_repository.clear_cache', true),
            'health_check' => (bool) config('git_repository.health_check', true),
            'valid' => true,
        ];

        if (! $this->isSafeRepositoryUrl($defaults['repository_url'])
            || ! preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/', $defaults['remote'])
            || ! in_array($defaults['repository_type'], ['public', 'private'], true)
            || ! in_array($defaults['authentication'], ['none', 'personal_access_token', 'ssh_deploy_key'], true)) {
            $defaults['enabled'] = false;
            $defaults['valid'] = false;
        }

        $disk = Storage::disk('local');
        $path = $disk->path(self::SETTINGS_PATH);

        if (is_link(dirname($path))) {
            return $this->storedSettings = [...$defaults, 'enabled' => false, 'valid' => false];
        }

        if (! file_exists($path)) {
            return $this->storedSettings = $defaults;
        }

        if (is_link($path) || ! is_file($path) || filesize($path) > 16384) {
            return $this->storedSettings = [...$defaults, 'enabled' => false, 'valid' => false];
        }

        try {
            $stored = json_decode($disk->get(self::SETTINGS_PATH), true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return $this->storedSettings = [...$defaults, 'enabled' => false, 'valid' => false];
        }

        if (is_array($stored)) {
            $stored = [...$defaults, ...$stored];
        }

        if (! is_array($stored)
            || ! is_bool($stored['enabled'] ?? null)
            || ! is_string($stored['branch'] ?? null)
            || strlen($stored['branch']) > 100
            || preg_match('/\A[A-Za-z0-9._\/-]+\z/', $stored['branch']) !== 1
            || ! is_string($stored['repository_type'] ?? null)
            || ! in_array($stored['repository_type'], ['public', 'private'], true)
            || ! is_string($stored['repository_url'] ?? null)
            || ! $this->isSafeRepositoryUrl($stored['repository_url'])
            || ! is_string($stored['remote'] ?? null)
            || preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/', $stored['remote']) !== 1
            || ! is_string($stored['authentication'] ?? null)
            || ! in_array($stored['authentication'], ['none', 'personal_access_token', 'ssh_deploy_key'], true)
            || ! is_bool($stored['run_migrations'] ?? null)
            || ! is_bool($stored['clear_cache'] ?? null)
            || ! is_bool($stored['health_check'] ?? null)
            || ! (is_null($stored['credential'] ?? null) || is_string($stored['credential']))
            || ($stored['repository_type'] === 'private' && ! in_array($stored['authentication'], ['personal_access_token', 'ssh_deploy_key'], true))
            || ($stored['repository_type'] === 'private' && ! is_string($stored['credential'] ?? null))
            || ($stored['authentication'] === 'personal_access_token' && ! is_string($stored['credential'] ?? null))
            || ($stored['authentication'] === 'ssh_deploy_key' && (! is_string($stored['credential'] ?? null) || preg_match('#\Agit@github\.com:#i', $stored['repository_url']) !== 1))
            || ($stored['authentication'] === 'none' && ($stored['credential'] ?? null) !== null)) {
            return $this->storedSettings = [...$defaults, 'enabled' => false, 'valid' => false];
        }

        try {
            $credential = is_string($stored['credential'] ?? null)
                ? Crypt::decryptString($stored['credential'])
                : null;
        } catch (\Throwable) {
            return $this->storedSettings = [...$defaults, 'enabled' => false, 'valid' => false];
        }

        return $this->storedSettings = [
            'enabled' => $stored['enabled'],
            'branch' => $stored['branch'],
            'repository_type' => $stored['repository_type'],
            'repository_url' => $stored['repository_url'],
            'remote' => $stored['remote'],
            'authentication' => $stored['authentication'],
            'credential' => $credential,
            'run_migrations' => $stored['run_migrations'],
            'clear_cache' => $stored['clear_cache'],
            'health_check' => $stored['health_check'],
            'valid' => true,
        ];
    }

    /** @param array{enabled: bool, branch: string, repository_type: string, repository_url: string, remote: string, authentication: string, credential: ?string, run_migrations: bool, clear_cache: bool, health_check: bool} $settings */
    private function writeSettings(array $settings): void
    {
        $disk = Storage::disk('local');
        $directory = dirname(self::SETTINGS_PATH);
        $directoryPath = $disk->path($directory);
        $settingsPath = $disk->path(self::SETTINGS_PATH);

        if (is_link($directoryPath) || is_link($settingsPath)) {
            throw new RuntimeException('The private repository settings path is unsafe.');
        }

        if (! is_dir($directoryPath) && ! $disk->makeDirectory($directory)) {
            throw new RuntimeException('The private repository settings directory could not be created.');
        }

        $temporaryPath = $directory.'/.git-repository-'.bin2hex(random_bytes(12)).'.tmp';
        $contents = json_encode([
            ...$settings,
            'credential' => $settings['credential'] === null ? null : Crypt::encryptString($settings['credential']),
        ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);

        try {
            if (! $disk->put($temporaryPath, $contents, ['visibility' => 'private'])) {
                throw new RuntimeException('The private repository settings could not be written.');
            }

            if (! $disk->move($temporaryPath, self::SETTINGS_PATH)) {
                throw new RuntimeException('The private repository settings could not be saved.');
            }
        } catch (\Throwable) {
            if ($disk->exists($temporaryPath)) {
                $disk->delete($temporaryPath);
            }

            throw new RuntimeException('Private repository settings could not be saved safely.');
        }

        $this->storedSettings = [...$settings, 'valid' => true];
    }

    /** @param array{status: string, branch: string, previous_commit: string, target_commit: ?string, commits_applied: int, change: string, checks: list<string>, finished_at: string} $entry */
    private function recordHistory(array $entry): void
    {
        try {
            $disk = Storage::disk('local');
            $directory = dirname(self::HISTORY_PATH);
            $directoryPath = $disk->path($directory);
            $historyPath = $disk->path(self::HISTORY_PATH);

            if (is_link($directoryPath) || is_link($historyPath)) {
                return;
            }

            if (! is_dir($directoryPath) && ! $disk->makeDirectory($directory)) {
                return;
            }

            $history = array_slice($this->historyForPage(), 0, 19);
            array_unshift($history, $entry);
            $temporaryPath = $directory.'/.git-history-'.bin2hex(random_bytes(12)).'.tmp';

            if (! $disk->put($temporaryPath, json_encode($history, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), ['visibility' => 'private'])) {
                return;
            }

            if (! $disk->move($temporaryPath, self::HISTORY_PATH) && $disk->exists($temporaryPath)) {
                $disk->delete($temporaryPath);
            }
        } catch (\Throwable) {
            // History is best effort; it must never mask the Git operation result.
        }
    }

    private function canConfigure(): bool
    {
        return $this->supportsGitActions()
            && function_exists('proc_open')
            && $this->gitAvailable();
    }

    private function supportsGitActions(): bool
    {
        return app()->environment(['local', 'production']);
    }

    private function configurationMessage(): ?string
    {
        if (! $this->supportsGitActions()) {
            return 'Settings and Git actions are disabled in the automated testing environment.';
        }

        if (! function_exists('proc_open')) {
            return 'The PHP runtime does not allow launching Git processes.';
        }

        if (! $this->gitAvailable()) {
            return 'The hosting PHP runtime cannot start the Git executable. Ask the hosting administrator to confirm Git and process execution are available.';
        }

        return null;
    }

    private function gitAvailable(): bool
    {
        try {
            return $this->executeGit(['--version'])['code'] === 0;
        } catch (\Throwable) {
            return false;
        }
    }

    private function branch(): string
    {
        return $this->settings()['branch'];
    }

    private function remote(): string
    {
        return $this->settings()['remote'];
    }

    private function repositoryUrl(): string
    {
        return $this->settings()['repository_url'];
    }

    /** @return array<string, string> */
    private function authenticationEnvironment(): array
    {
        $settings = $this->settings();

        return $this->authenticationEnvironmentFor($settings['authentication'], $settings['credential']);
    }

    /** @return array<string, string> */
    private function authenticationEnvironmentFor(string $authentication, ?string $credential): array
    {
        if ($authentication === 'ssh_deploy_key' && $credential !== null) {
            $directory = storage_path('app/private/git-repository');
            File::ensureDirectoryExists($directory);
            $directoryPath = realpath($directory);

            if ($directoryPath === false || is_link($directory)) {
                throw new RuntimeException('The private SSH key directory is unsafe.');
            }

            $keyPath = $directoryPath.DIRECTORY_SEPARATOR.'deploy-key-'.bin2hex(random_bytes(12));
            if (file_put_contents($keyPath, $credential, LOCK_EX) === false || ! chmod($keyPath, 0600)) {
                if (is_file($keyPath)) {
                    unlink($keyPath);
                }

                throw new RuntimeException('The temporary SSH deploy key could not be protected.');
            }

            return [
                'GIT_SSH_COMMAND' => 'ssh -i '.escapeshellarg($keyPath).' -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes',
                'CLINIC_GIT_TEMP_KEY_PATH' => $keyPath,
            ];
        }

        if ($authentication !== 'personal_access_token' || $credential === null) {
            return [];
        }

        $authorization = base64_encode('x-access-token:'.$credential);

        return [
            'GIT_CONFIG_COUNT' => '1',
            'GIT_CONFIG_KEY_0' => 'http.extraHeader',
            'GIT_CONFIG_VALUE_0' => 'Authorization: Basic '.$authorization,
        ];
    }

    private function isSafeRepositoryUrl(string $url): bool
    {
        return preg_match('#\A(?:https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?|git@github\.com:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?)\z#i', $url) === 1;
    }

    /** @return list<array{hash: string, short: string, author: string, date: string, subject: string}> */
    private function commitList(string $range): array
    {
        $output = $this->runGit(['log', '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s', $range, '-n', '20']);
        $commits = [];

        foreach (array_filter(preg_split('/\R/', trim($output)) ?: []) as $line) {
            $parts = explode("\x1f", $line, 5);
            if (count($parts) === 5) {
                $commits[] = ['hash' => $parts[0], 'short' => $parts[1], 'author' => $parts[2], 'date' => $parts[3], 'subject' => $parts[4]];
            }
        }

        return $commits;
    }
}
