<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Process;

class GitRepositoryService
{
    /** @var list<string> */
    private const SAFE_PULL_PREFIXES = ['app/', 'routes/'];

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
            $snapshot['pull_available'] = $incomingCount > 0 && $this->incomingChangesAreSafe();

            if ($incomingCount > 0 && ! $snapshot['pull_available']) {
                $snapshot['message'] = 'This update includes migrations, frontend assets, dependencies, or deployment files. Use a reviewed release package instead.';
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

    /** @return array{enabled: bool, branch: string, repository_type: string, repository_url: string, remote: string, authentication: string, has_credential: bool, can_configure: bool, configuration_message: ?string} */
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

    /** @param array{enabled: bool, branch: string, remote: string, repository_type: string, repository_url: string, authentication: string, credential: ?string, clear_credential: bool} $settings */
    public function saveSettings(array $settings): void
    {
        if (! app()->isProduction()) {
            throw new RuntimeException('Repository settings can only be changed in production.');
        }

        if (! function_exists('proc_open') || ! file_exists(base_path('.git'))) {
            throw new RuntimeException('Settings cannot be enabled because this server is not running a Git checkout with process execution available.');
        }

        $branchCheck = $this->executeGit(['check-ref-format', '--branch', $settings['branch']]);
        if ($branchCheck['code'] !== 0) {
            throw new RuntimeException('The configured Git branch name is invalid.');
        }

        if (! preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/', $settings['remote'])) {
            throw new RuntimeException('The configured Git remote name is invalid.');
        }

        if ($settings['repository_type'] === 'private' && $settings['authentication'] !== 'personal_access_token') {
            throw new RuntimeException('Private GitHub repositories require a personal access token.');
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

        $this->assertRepositoryReady();
        if ($settings['enabled']) {
            $this->assertConfiguredRemote($settings);
        }

        $this->writeSettings([
            'enabled' => (bool) $settings['enabled'],
            'branch' => $settings['branch'],
            'repository_type' => $settings['repository_type'],
            'repository_url' => $settings['repository_url'],
            'remote' => $settings['remote'],
            'authentication' => $settings['authentication'],
            'credential' => $credential,
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

                if ($snapshot['status'] !== 'Update available' || ! $snapshot['pull_available']) {
                    throw new RuntimeException((string) $snapshot['message']);
                }

                $this->runGit(['merge', '--ff-only', $this->remoteTrackingBranch()]);
                $this->recordHistory([
                    'status' => 'completed',
                    'branch' => $this->branch(),
                    'previous_commit' => $previousCommit,
                    'target_commit' => (string) $targetCommit,
                    'commits_applied' => $commitsApplied,
                    'change' => 'Fast-forward backend update',
                    'checks' => ['Clean checkout', 'Approved repository URL', 'Fast-forward only', 'Backend PHP allowlist'],
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
        return app()->isProduction()
            && $this->settings()['valid']
            && $this->settings()['enabled']
            && function_exists('proc_open');
    }

    private function assertOperationsAllowed(): void
    {
        if (! app()->isProduction()) {
            throw new RuntimeException('Git-changing actions are disabled outside production.');
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
        if (! file_exists(base_path('.git'))) {
            throw new RuntimeException('This deployed installation is not a full Git checkout.');
        }

        $root = realpath(trim($this->runGit(['rev-parse', '--show-toplevel'])));
        $applicationRoot = realpath(base_path());

        if ($root === false || $applicationRoot === false || $root !== $applicationRoot) {
            throw new RuntimeException('Git repository root does not match the Laravel application directory.');
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
        $output = $this->runGit(['status', '--porcelain', '--untracked-files=all']);

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
            if (count($parts) !== 2 || ! in_array($parts[0], ['A', 'M'], true)) {
                return false;
            }

            $path = $parts[1];
            $safePath = false;
            foreach (self::SAFE_PULL_PREFIXES as $prefix) {
                if (str_starts_with($path, $prefix) && str_ends_with($path, '.php')) {
                    $safePath = true;
                    break;
                }
            }

            if (! $safePath) {
                return false;
            }
        }

        return true;
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
            throw new RuntimeException('A Git operation failed. Check the private server logs and repository configuration.');
        }

        return $result['output'];
    }

    private function unavailableMessage(): string
    {
        if (! app()->isProduction()) {
            return 'Repository operations are intentionally disabled in local and test environments.';
        }

        if (! $this->settings()['valid'] || ! $this->settings()['enabled']) {
            return 'Repository operations are disabled. Enable them from Repository settings in a production Git checkout.';
        }

        if (! function_exists('proc_open')) {
            return 'The PHP runtime cannot launch Git. Ask the hosting administrator whether process execution is available.';
        }

        if (! file_exists(base_path('.git'))) {
            return 'This cPanel release package has no .git directory. Use the verified release artifact deployment process for this installation.';
        }

        return 'The Git checkout, remote, or configured branch could not be verified.';
    }

    /** @return array{enabled: bool, branch: string, repository_type: string, repository_url: string, remote: string, authentication: string, credential: ?string, valid: bool} */
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
            'valid' => true,
        ];

        if (! $this->isSafeRepositoryUrl($defaults['repository_url'])
            || ! preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/', $defaults['remote'])
            || ! in_array($defaults['repository_type'], ['public', 'private'], true)
            || ! in_array($defaults['authentication'], ['none', 'personal_access_token'], true)) {
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

        if (is_array($stored) && ! array_key_exists('repository_type', $stored)) {
            $stored = [...$defaults, ...$stored];
        }

        if (! is_array($stored)
            || ! is_bool($stored['enabled'] ?? null)
            || ! is_string($stored['branch'] ?? null)
            || strlen($stored['branch']) > 100
            || preg_match('/\A[A-Za-z0-9._-]+\z/', $stored['branch']) !== 1
            || ! is_string($stored['repository_type'] ?? null)
            || ! in_array($stored['repository_type'], ['public', 'private'], true)
            || ! is_string($stored['repository_url'] ?? null)
            || ! $this->isSafeRepositoryUrl($stored['repository_url'])
            || ! is_string($stored['remote'] ?? null)
            || preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]*\z/', $stored['remote']) !== 1
            || ! is_string($stored['authentication'] ?? null)
            || ! in_array($stored['authentication'], ['none', 'personal_access_token'], true)
            || ! (is_null($stored['credential'] ?? null) || is_string($stored['credential']))
            || ($stored['repository_type'] === 'private' && $stored['authentication'] !== 'personal_access_token')
            || ($stored['repository_type'] === 'private' && ! is_string($stored['credential'] ?? null))
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
            'valid' => true,
        ];
    }

    /** @param array{enabled: bool, branch: string, repository_type: string, repository_url: string, remote: string, authentication: string, credential: ?string} $settings */
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
        return app()->isProduction()
            && function_exists('proc_open')
            && file_exists(base_path('.git'));
    }

    private function configurationMessage(): ?string
    {
        if (! app()->isProduction()) {
            return 'Settings and Git actions are disabled in local and test environments.';
        }

        if (! function_exists('proc_open')) {
            return 'The PHP runtime does not allow launching Git processes.';
        }

        if (! file_exists(base_path('.git'))) {
            return 'This cPanel ZIP has no .git metadata. Git updates need a full Git checkout; the current ZIP deployment cannot update files from this page.';
        }

        return null;
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

        if ($settings['authentication'] !== 'personal_access_token' || $settings['credential'] === null) {
            return [];
        }

        $authorization = base64_encode('x-access-token:'.$settings['credential']);

        return [
            'GIT_CONFIG_COUNT' => '1',
            'GIT_CONFIG_KEY_0' => 'http.extraHeader',
            'GIT_CONFIG_VALUE_0' => 'Authorization: Basic '.$authorization,
        ];
    }

    private function isSafeRepositoryUrl(string $url): bool
    {
        return preg_match('#\Ahttps://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?\z#i', $url) === 1;
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
