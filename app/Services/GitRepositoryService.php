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

    private const SOURCE_MARKER = 'DEPLOYED_GIT_REPOSITORY';

    private const DEPLOYED_COMMIT_MARKER = 'DEPLOYED_COMMIT';

    private const MANAGED_SOURCE_PATH = 'git-repository/source';

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
            'source_commit' => null,
            'remote_commit' => null,
            'incoming_commits' => 0,
            'incoming_commit_details' => [],
            'working_tree_changes' => 0,
            'working_tree_paths' => [],
            'pull_available' => false,
            'deploy_available' => false,
            'source_reconnect_available' => $this->sourceReconnectAvailable($settings),
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
                $snapshot['message'] = 'No private application-managed Git checkout is connected. Save the enabled settings to initialize one.';

                return $snapshot;
            }

            $this->assertRepositoryReady();
            $this->assertConfiguredRemote();

            $currentBranch = trim($this->runGit(['branch', '--show-current']));
            $sourceCommit = trim($this->runGit(['rev-parse', 'HEAD']));
            $deployedCommit = $this->deployedCommit() ?? $sourceCommit;
            $snapshot['source_commit'] = $sourceCommit;
            $snapshot['local_commit'] = $deployedCommit;
            $changes = $this->workingTreeChanges();
            $snapshot['working_tree_changes'] = count($changes);
            $snapshot['working_tree_paths'] = array_map(static fn (string $change): string => trim(substr($change, 3)), $changes);

            if ($currentBranch !== $settings['branch']) {
                $snapshot['status'] = 'Wrong branch';
                $snapshot['message'] = 'The registered source checkout is not on the configured branch.';

                return $snapshot;
            }

            if (! $this->isAncestor($deployedCommit, $sourceCommit)) {
                $snapshot['status'] = 'Branches diverged';
                $snapshot['message'] = 'The deployed commit is not an ancestor of the registered source checkout.';

                return $snapshot;
            }

            $remoteRef = $this->remoteBranch();
            if ($remoteRef === null) {
                $snapshot['status'] = 'Not checked';
                $snapshot['message'] = 'Check the repository to load the latest remote commit.';

                return $snapshot;
            }

            $snapshot['remote_commit'] = $remoteRef;
            $incomingCount = (int) trim($this->runGit(['rev-list', '--count', $deployedCommit.'..'.$this->remoteTrackingBranch()]));
            $snapshot['incoming_commits'] = $incomingCount;
            $snapshot['incoming_commit_details'] = $incomingCount > 0 ? $this->commitList($deployedCommit.'..'.$this->remoteTrackingBranch()) : [];

            if ($changes !== []) {
                $snapshot['status'] = 'Local changes detected';
                $snapshot['message'] = 'The registered source checkout has tracked changes. Review them before updating.';

                return $snapshot;
            }

            if (! $this->isAncestor($deployedCommit, $this->remoteTrackingBranch())
                || ! $this->isAncestor($sourceCommit, $this->remoteTrackingBranch())) {
                $snapshot['status'] = 'Branches diverged';
                $snapshot['message'] = 'The source or deployed commit has diverged from the configured remote branch.';

                return $snapshot;
            }

            $snapshot['status'] = $incomingCount > 0 ? 'Update available' : 'Up to date';
            $snapshot['message'] = $incomingCount > 0
                ? $incomingCount.' fast-forward update(s) are available.'
                : 'The live application is up to date with the configured remote branch.';
            $snapshot['deploy_available'] = $incomingCount > 0 && $this->incomingChangesAreSafe($deployedCommit);
            $snapshot['pull_available'] = $snapshot['deploy_available'];

            if ($incomingCount > 0 && ! $snapshot['deploy_available']) {
                $snapshot['message'] = 'This update is blocked by a safety check. Review protected paths, migration settings, and frontend build requirements before deploying.';
            }
        } catch (RuntimeException $exception) {
            $snapshot['status'] = 'Unavailable';
            $snapshot['message'] = $exception->getMessage();
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

    public function reconnectSourceCheckout(): void
    {
        $this->assertOperationsAllowed();

        if ($this->managedSourceCheckoutMatchesSettings()) {
            $this->writeSourceRegistration((string) realpath($this->managedRepositoryPath()));
            $this->assertRepositoryReady();
            $this->assertConfiguredRemote();

            return;
        }

        if (! $this->isSplitDeployment() && ! $this->managedRepositoryExists() && $this->isCpanelSplitDeployment()) {
            $this->initializeManagedCheckout($this->settings());
            $this->assertRepositoryReady();
            $this->assertConfiguredRemote();

            return;
        }

        if (! $this->isCpanelSplitDeployment()) {
            throw new RuntimeException('A private application-managed checkout can only be initialized from an enabled split deployment.');
        }

        $matchingCheckouts = $this->matchingSourceCheckouts();

        if ($matchingCheckouts === []) {
            throw new RuntimeException('No readable cPanel Git checkout matched the saved repository and branch. Restore the source checkout under the account repositories directory, then reconnect.');
        }

        if (count($matchingCheckouts) > 1) {
            throw new RuntimeException('More than one cPanel Git checkout matched the saved repository and branch. Keep one authoritative checkout or ask the hosting administrator to resolve the duplicate.');
        }

        $this->writeSourceRegistration($matchingCheckouts[0]);
        $this->assertRepositoryReady();
        $this->assertConfiguredRemote();
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
            $repositoryExists = $this->readableRepositoryExists();

            if (! $repositoryExists) {
                if (! $this->isCpanelSplitDeployment()) {
                    throw new RuntimeException('The live application has no registered source checkout. Enable this from a split deployment so the application can create its private managed checkout.');
                }

                if ($this->managedSourceCheckoutMatchesSettings($settings)) {
                    $this->writeSourceRegistration((string) realpath($this->managedRepositoryPath()));
                } elseif (! $this->isSplitDeployment() && ! $this->managedRepositoryExists()) {
                    $this->initializeManagedCheckout([
                        'branch' => $settings['branch'],
                        'remote' => $settings['remote'],
                        'repository_url' => $settings['repository_url'],
                        'authentication' => $settings['authentication'],
                        'credential' => $credential,
                    ]);
                } else {
                    $matchingCheckouts = $this->matchingSourceCheckouts($settings);

                    if ($matchingCheckouts === []) {
                        throw new RuntimeException('No readable cPanel Git checkout matched the saved repository and branch. Restore the source checkout under the account repositories directory, then reconnect.');
                    }

                    if (count($matchingCheckouts) > 1) {
                        throw new RuntimeException('More than one cPanel Git checkout matched the saved repository and branch. Keep one authoritative checkout or ask the hosting administrator to resolve the duplicate.');
                    }

                    $this->writeSourceRegistration($matchingCheckouts[0]);
                }
            }

            $this->assertRepositoryReady();
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
            $previousCommit = $this->deployedCommit() ?? trim($this->runGit(['rev-parse', 'HEAD']));
            $targetCommit = null;
            $commitsApplied = 0;

            try {
                $snapshot = $this->check();
                $targetCommit = $snapshot['remote_commit'];
                $commitsApplied = (int) $snapshot['incoming_commits'];
                $incomingMigrations = $this->incomingChangesContainMigrations($previousCommit);

                if ($snapshot['status'] !== 'Update available' || ! $snapshot['deploy_available']) {
                    throw new RuntimeException((string) $snapshot['message']);
                }

                $this->runGit(['merge', '--ff-only', $this->remoteTrackingBranch()]);
                $checks = ['Clean tracked checkout', 'Untracked files preserved', 'Approved GitHub URL', 'Fast-forward only'];

                if ($this->isCpanelSplitDeployment()) {
                    $this->runSplitDeployment((string) $targetCommit);
                    $checks[] = 'Verified application release installed';
                    $checks[] = 'Application caches rebuilt';

                    if ($incomingMigrations) {
                        $checks[] = 'Reviewed forward migrations completed';
                    }
                } elseif ($incomingMigrations && $this->settings()['run_migrations']) {
                    $this->runArtisan(['migrate', '--force']);
                    $checks[] = 'Forward migrations completed';
                }

                if (! $this->isCpanelSplitDeployment() && $this->settings()['clear_cache']) {
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
        $repositoryRoot = $this->repositoryRoot();

        if (! file_exists($repositoryRoot.DIRECTORY_SEPARATOR.'.git') || is_link($repositoryRoot.DIRECTORY_SEPARATOR.'.git')) {
            throw new RuntimeException('This deployed installation is not a full Git checkout.');
        }

        $root = realpath(trim($this->runGit(['rev-parse', '--show-toplevel'])));
        $applicationRoot = realpath($repositoryRoot);

        if ($root === false || $applicationRoot === false || $root !== $applicationRoot) {
            throw new RuntimeException('Git repository root does not match the Laravel application directory.');
        }
    }

    private function repositoryExists(): bool
    {
        return file_exists($this->repositoryRoot().DIRECTORY_SEPARATOR.'.git');
    }

    private function readableRepositoryExists(): bool
    {
        try {
            if (! $this->repositoryExists()) {
                return false;
            }

            $this->assertRepositoryReady();

            return true;
        } catch (RuntimeException) {
            return false;
        }
    }

    private function managedRepositoryPath(): string
    {
        return Storage::disk('local')->path(self::MANAGED_SOURCE_PATH);
    }

    private function managedRepositoryExists(): bool
    {
        $path = $this->managedRepositoryPath();

        return is_dir($path)
            && ! is_link($path)
            && is_dir($path.DIRECTORY_SEPARATOR.'.git')
            && ! is_link($path.DIRECTORY_SEPARATOR.'.git');
    }

    /** @param array{branch: string, remote: string, repository_url: string, authentication: string, credential: ?string} $settings */
    private function initializeManagedCheckout(array $settings): void
    {
        $targetPath = $this->managedRepositoryPath();
        $parentPath = dirname($targetPath);

        if (is_link($parentPath) || is_link($targetPath)) {
            throw new RuntimeException('The private Git checkout directory is unsafe.');
        }

        if (file_exists($targetPath)) {
            throw new RuntimeException('A private Git checkout already exists but is not readable. Review it before retrying.');
        }

        File::ensureDirectoryExists($parentPath, 0700);
        $temporaryPath = $parentPath.DIRECTORY_SEPARATOR.'.source-'.bin2hex(random_bytes(12));

        try {
            $result = $this->executeGitInDirectory(base_path(), [
                'clone',
                '--no-tags',
                '--single-branch',
                '--branch',
                $settings['branch'],
                '--',
                $settings['repository_url'],
                $temporaryPath,
            ], $this->authenticationEnvironmentFor($settings['authentication'], $settings['credential']));

            if ($result['code'] !== 0) {
                throw new RuntimeException($this->gitFailureMessage(['clone'], $result));
            }

            if ($settings['remote'] !== 'origin') {
                $rename = $this->executeGitInDirectory($temporaryPath, ['remote', 'rename', 'origin', $settings['remote']]);

                if ($rename['code'] !== 0) {
                    throw new RuntimeException($this->gitFailureMessage(['remote'], $rename));
                }
            }

            $root = $this->executeGitInDirectory($temporaryPath, ['rev-parse', '--show-toplevel']);
            if ($root['code'] !== 0 || realpath(trim($root['output'])) !== realpath($temporaryPath)) {
                throw new RuntimeException('The private Git checkout could not be verified safely.');
            }

            if (! @rename($temporaryPath, $targetPath)) {
                throw new RuntimeException('The private Git checkout could not be installed safely.');
            }
        } finally {
            if (is_dir($temporaryPath) && ! is_link($temporaryPath)) {
                File::deleteDirectory($temporaryPath);
            }
        }
    }

    private function isSplitDeployment(): bool
    {
        return file_exists(base_path(self::SOURCE_MARKER)) || is_link(base_path(self::SOURCE_MARKER));
    }

    private function repositoryRoot(): string
    {
        if ($this->isSplitDeployment()) {
            $marker = base_path(self::SOURCE_MARKER);
            if (is_link($marker) || ! is_file($marker) || filesize($marker) > 4096) {
                throw new RuntimeException('The registered source checkout is invalid.');
            }

            $registeredPath = trim((string) file_get_contents($marker));
            $repositoryRoot = realpath($registeredPath);
            $accountRoot = realpath(dirname(base_path()));
            $applicationRoot = realpath(base_path());
            $managedRepository = realpath($this->managedRepositoryPath());
            $isManagedRepository = $managedRepository !== false && $repositoryRoot === $managedRepository;

            if ($repositoryRoot === false || $accountRoot === false || $applicationRoot === false
                || is_link($registeredPath)
                || ! str_starts_with($repositoryRoot, $accountRoot.DIRECTORY_SEPARATOR)
                || (! $isManagedRepository && ($repositoryRoot === $applicationRoot
                    || str_starts_with($repositoryRoot, $applicationRoot.DIRECTORY_SEPARATOR)))
                || str_starts_with($repositoryRoot, $accountRoot.DIRECTORY_SEPARATOR.'public_html'.DIRECTORY_SEPARATOR)) {
                throw new RuntimeException('The registered source checkout is outside the private account area.');
            }

            return $repositoryRoot;
        }

        if ($this->managedRepositoryExists()) {
            return (string) realpath($this->managedRepositoryPath());
        }

        return base_path();
    }

    private function isCpanelSplitDeployment(): bool
    {
        $deployedCommitMarker = base_path(self::DEPLOYED_COMMIT_MARKER);
        $applicationPublicPath = base_path('public');
        $accountPublicPath = dirname(base_path()).DIRECTORY_SEPARATOR.'public_html';

        return $this->isSplitDeployment()
            || file_exists($deployedCommitMarker)
            || is_link($deployedCommitMarker)
            || (! is_dir($applicationPublicPath) && is_dir($accountPublicPath));
    }

    /** @param array{valid: bool, enabled: bool} $settings */
    private function sourceReconnectAvailable(array $settings): bool
    {
        if (! $settings['valid'] || ! $settings['enabled'] || ! $this->supportsGitActions()
            || ! function_exists('proc_open') || ! $this->gitAvailable() || ! $this->isCpanelSplitDeployment()) {
            return false;
        }

        if ($this->managedSourceCheckoutMatchesSettings()) {
            return true;
        }

        if (! $this->isSplitDeployment() && ! $this->managedRepositoryExists()) {
            return true;
        }

        $accountRoot = realpath(dirname(base_path()));
        if ($accountRoot === false) {
            return false;
        }

        $repositoriesPath = $accountRoot.DIRECTORY_SEPARATOR.'repositories';

        return ! is_link($repositoriesPath) && is_dir($repositoriesPath) && is_readable($repositoriesPath);
    }

    /** @return list<string> */
    /** @param array{branch: string, remote: string, repository_url: string}|null $settings */
    private function matchingSourceCheckouts(?array $settings = null): array
    {
        $accountRoot = realpath(dirname(base_path()));
        $repositoriesEntry = $accountRoot === false ? false : $accountRoot.DIRECTORY_SEPARATOR.'repositories';
        $repositoriesPath = $repositoriesEntry === false ? false : realpath($repositoriesEntry);

        if ($accountRoot === false || $repositoriesPath === false || is_link($repositoriesEntry)
            || ! str_starts_with($repositoriesPath, $accountRoot.DIRECTORY_SEPARATOR) || ! is_readable($repositoriesPath)) {
            throw new RuntimeException('The cPanel account repositories directory is missing or unreadable. Ask the hosting administrator to restore access to that directory.');
        }

        $directories = [[$repositoriesPath, 0]];
        $matchingCheckouts = [];
        $visitedDirectories = 0;
        $maximumDepth = 4;
        $maximumDirectories = 2000;

        while ($directories !== []) {
            [$directory, $depth] = array_pop($directories);

            try {
                $entries = new \FilesystemIterator($directory, \FilesystemIterator::SKIP_DOTS);
            } catch (\Throwable) {
                continue;
            }

            foreach ($entries as $entry) {
                if (! $entry->isDir() || $entry->isLink()) {
                    continue;
                }

                $candidate = $entry->getPathname();
                $gitDirectory = $candidate.DIRECTORY_SEPARATOR.'.git';

                if (! is_link($gitDirectory) && is_dir($gitDirectory)) {
                    if ($this->isMatchingSourceCheckout($candidate, $repositoriesPath, $settings)) {
                        $matchingCheckouts[] = realpath($candidate);
                    }

                    continue;
                }

                if ($depth < $maximumDepth) {
                    $directories[] = [$candidate, $depth + 1];
                    $visitedDirectories++;

                    if ($visitedDirectories > $maximumDirectories) {
                        throw new RuntimeException('The cPanel repositories directory contains too many folders to search safely. Keep the Clinic checkout near the repositories directory and retry.');
                    }
                }
            }
        }

        return array_values(array_unique(array_filter($matchingCheckouts, 'is_string')));
    }

    /** @param array{branch: string, remote: string, repository_url: string}|null $settings */
    private function isMatchingSourceCheckout(string $candidate, string $repositoriesPath, ?array $settings = null): bool
    {
        $candidateRoot = realpath($candidate);

        if ($candidateRoot === false || ! str_starts_with($candidateRoot, $repositoriesPath.DIRECTORY_SEPARATOR)) {
            return false;
        }

        $topLevel = $this->executeGitInDirectory($candidateRoot, ['rev-parse', '--show-toplevel']);
        if ($topLevel['code'] !== 0 || realpath($topLevel['output']) !== $candidateRoot) {
            return false;
        }

        $branchName = $settings['branch'] ?? $this->branch();
        $remoteName = $settings['remote'] ?? $this->remote();
        $repositoryUrl = $settings['repository_url'] ?? $this->repositoryUrl();
        $branch = $this->executeGitInDirectory($candidateRoot, ['branch', '--show-current']);
        if ($branch['code'] !== 0 || trim($branch['output']) !== $branchName) {
            return false;
        }

        $remoteUrl = $this->executeGitInDirectory($candidateRoot, ['remote', 'get-url', $remoteName]);

        return $remoteUrl['code'] === 0
            && $this->normalizeRepositoryUrl(trim($remoteUrl['output'])) === $this->normalizeRepositoryUrl($repositoryUrl);
    }

    private function writeSourceRegistration(string $repositoryRoot): void
    {
        $applicationRoot = realpath(base_path());
        $accountRoot = realpath(dirname(base_path()));
        $markerPath = base_path(self::SOURCE_MARKER);
        $managedRepository = realpath($this->managedRepositoryPath());
        $isManagedRepository = $managedRepository !== false && $repositoryRoot === $managedRepository;

        if ($applicationRoot === false || $accountRoot === false || is_link(base_path()) || is_link($markerPath)
            || (file_exists($markerPath) && ! is_file($markerPath))
            || ! str_starts_with($repositoryRoot, $accountRoot.DIRECTORY_SEPARATOR)
            || (! $isManagedRepository && ($repositoryRoot === $applicationRoot
                || str_starts_with($repositoryRoot, $applicationRoot.DIRECTORY_SEPARATOR)))
            || str_starts_with($repositoryRoot, $accountRoot.DIRECTORY_SEPARATOR.'public_html'.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('The matching source checkout is not in an approved private cPanel location.');
        }

        $contents = $repositoryRoot.PHP_EOL;

        if (DIRECTORY_SEPARATOR === '\\') {
            if (@file_put_contents($markerPath, $contents, LOCK_EX) !== strlen($contents)) {
                throw new RuntimeException('The source checkout registration could not be written safely. Check private application directory permissions.');
            }

            return;
        }

        $temporaryPath = dirname($markerPath).DIRECTORY_SEPARATOR.'.git-source-'.bin2hex(random_bytes(12)).'.tmp';
        $handle = @fopen($temporaryPath, 'x');

        if ($handle === false) {
            throw new RuntimeException('A private temporary source registration could not be created.');
        }

        try {
            $written = @fwrite($handle, $contents);
            $flushed = @fflush($handle);
            $closed = @fclose($handle);
            $handle = false;

            if (! @chmod($temporaryPath, 0600) || $written !== strlen($contents) || ! $flushed || ! $closed
                || ! @rename($temporaryPath, $markerPath)) {
                throw new RuntimeException('The source checkout registration could not be replaced safely. Check private application directory permissions.');
            }
        } finally {
            if (is_resource($handle)) {
                fclose($handle);
            }

            if (is_file($temporaryPath) && ! is_link($temporaryPath)) {
                unlink($temporaryPath);
            }
        }
    }

    /** @param array{branch: string, remote: string, repository_url: string}|null $settings */
    private function managedSourceCheckoutMatchesSettings(?array $settings = null): bool
    {
        if (! $this->managedRepositoryExists()) {
            return false;
        }

        $repositoryRoot = realpath($this->managedRepositoryPath());
        $storageRoot = $repositoryRoot === false ? false : realpath(dirname($repositoryRoot));

        if ($repositoryRoot === false || $storageRoot === false) {
            return false;
        }

        return $this->isMatchingSourceCheckout($repositoryRoot, $storageRoot, $settings);
    }

    private function deployedCommit(): ?string
    {
        if (! $this->isSplitDeployment()) {
            return null;
        }

        $marker = base_path(self::DEPLOYED_COMMIT_MARKER);
        if (is_link($marker) || ! is_file($marker) || filesize($marker) > 80) {
            throw new RuntimeException('The deployed commit marker is missing or invalid.');
        }

        $commit = trim((string) file_get_contents($marker));
        if (preg_match('/\A[a-f0-9]{40}\z/', $commit) !== 1) {
            throw new RuntimeException('The deployed commit marker does not contain a valid commit.');
        }

        return $commit;
    }

    private function isAncestor(string $ancestor, string $descendant): bool
    {
        $result = $this->executeGit(['merge-base', '--is-ancestor', $ancestor, $descendant]);

        if ($result['code'] === 0) {
            return true;
        }

        if ($result['code'] === 1) {
            return false;
        }

        throw new RuntimeException('The source checkout could not verify commit ancestry.');
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

    private function incomingChangesAreSafe(string $fromCommit): bool
    {
        if ($this->isSplitDeployment() && ! $this->settings()['clear_cache']) {
            return false;
        }

        $output = $this->runGit(['diff', '--name-status', '--no-renames', $fromCommit, $this->remoteTrackingBranch()]);
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

        $rawChanges = $this->runGit(['diff', '--raw', '--no-renames', $fromCommit, $this->remoteTrackingBranch()]);
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

        return $this->incomingFrontendBuildIsValid($fromCommit)
            && (! $this->incomingChangesContainMigrations($fromCommit)
                || ($this->settings()['run_migrations'] && $this->incomingMigrationsAreForwardOnly($fromCommit)));
    }

    private function incomingFrontendBuildIsValid(string $fromCommit): bool
    {
        $changedPaths = trim($this->runGit([
            'diff', '--name-only', $fromCommit, $this->remoteTrackingBranch(), '--',
            'resources/js', 'resources/css', 'vite.config.js', 'package.json', 'package-lock.json',
        ]));

        if ($this->isSplitDeployment()) {
            foreach (['deploy/cpanel/update-live.sh', 'deploy/cpanel/build-release.sh', 'package-lock.json'] as $requiredPath) {
                if ($this->executeGit(['cat-file', '-e', $this->remoteTrackingBranch().':'.$requiredPath])['code'] !== 0) {
                    return false;
                }
            }

            return true;
        }

        if ($changedPaths === '') {
            return true;
        }

        $manifestPath = 'public/build/manifest.json';
        $manifestChanges = preg_split('/\R/', trim($this->runGit([
            'diff', '--name-only', $fromCommit, $this->remoteTrackingBranch(), '--', $manifestPath,
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

    private function incomingChangesContainMigrations(string $fromCommit): bool
    {
        $output = $this->runGit(['diff', '--name-only', $fromCommit, $this->remoteTrackingBranch(), '--', 'database/migrations']);

        return trim($output) !== '';
    }

    private function incomingMigrationsAreForwardOnly(string $fromCommit): bool
    {
        $output = $this->runGit(['diff', '--name-status', '--no-renames', $fromCommit, $this->remoteTrackingBranch(), '--', 'database/migrations']);
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

    private function runSplitDeployment(string $targetCommit): void
    {
        $repositoryRoot = $this->repositoryRoot();
        $script = $repositoryRoot.DIRECTORY_SEPARATOR.'deploy/cpanel/update-live.sh';
        $accountRoot = realpath(dirname(base_path()));

        if (preg_match('/\A[a-f0-9]{40}\z/', $targetCommit) !== 1 || $accountRoot === false || ! is_file($script) || is_link($script)) {
            throw new RuntimeException('The reviewed application deployment task is unavailable. No live files were changed by this page.');
        }

        try {
            $process = new Process(['/bin/bash', $script], $repositoryRoot, [
                'HOME' => $accountRoot,
                'CLINIC_ACCOUNT_ROOT' => $accountRoot,
                'CLINIC_DEPLOY_EXPECTED_COMMIT' => $targetCommit,
                'CLINIC_DEPLOY_ALLOW_MIGRATIONS' => $this->settings()['run_migrations'] ? '1' : '0',
            ], null, 1800);
            $process->run();
        } catch (\Throwable) {
            throw new RuntimeException('The hosting PHP runtime could not start the verified application deployment task.');
        }

        if (! $process->isSuccessful()) {
            throw new RuntimeException($this->deploymentFailureMessage($process->getErrorOutput()));
        }

        if ($this->deployedCommit() !== $targetCommit) {
            throw new RuntimeException('The deployment task finished without recording the reviewed commit as live.');
        }
    }

    private function deploymentFailureMessage(string $errorOutput): string
    {
        $error = strtolower($errorOutput);

        return match (true) {
            str_contains($error, 'another deployment is running') => 'An application deployment is already running. Wait for it to finish before retrying.',
            str_contains($error, 'new migration needs review'),
            str_contains($error, 'historical migration changed or removed') => 'The release contains database migration changes that need separate review before deployment.',
            str_contains($error, 'reviewed database migrations require') => 'Enable reviewed migrations explicitly before deploying this database change.',
            str_contains($error, 'php 8.3'),
            str_contains($error, 'php 8.3 command-line') => 'The host does not provide the PHP 8.3 command-line runtime required by this release.',
            str_contains($error, 'node.js 22'),
            str_contains($error, 'required deployment tool is unavailable: npm') => 'The host cannot build the locked frontend assets. Use a verified release artifact instead.',
            str_contains($error, 'this update task requires an initialized clinic installation') => 'The live installation is incomplete. Review its private application and public document root.',
            default => 'The application deployment task stopped. Review protected server deployment logs before retrying.',
        };
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
     * @param  array<string, string>  $environment
     * @return array{code: int, output: string, error: string}
     */
    private function executeGit(array $arguments, array $environment = []): array
    {
        $workingDirectory = in_array($arguments[0] ?? '', ['--version', 'check-ref-format'], true)
            ? base_path()
            : $this->repositoryRoot();

        return $this->executeGitInDirectory($workingDirectory, $arguments, $environment);
    }

    /**
     * @param  list<string>  $arguments
     * @param  array<string, string>  $environment
     * @return array{code: int, output: string, error: string}
     */
    private function executeGitInDirectory(string $workingDirectory, array $arguments, array $environment = []): array
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
                '-c', 'core.hooksPath='.(DIRECTORY_SEPARATOR === '\\' ? 'NUL' : '/dev/null'),
                '-c', 'credential.helper=',
            ], $arguments), $workingDirectory, array_merge([
                'GIT_TERMINAL_PROMPT' => '0',
                'GIT_CONFIG_NOSYSTEM' => '1',
                'GIT_CONFIG_GLOBAL' => DIRECTORY_SEPARATOR === '\\' ? 'NUL' : '/dev/null',
                'GIT_OPTIONAL_LOCKS' => '0',
                'GIT_DIR' => false,
                'GIT_WORK_TREE' => false,
                'GIT_INDEX_FILE' => false,
                'GIT_CONFIG' => false,
                'GIT_CONFIG_PARAMETERS' => false,
                'GIT_CONFIG_COUNT' => false,
                'GIT_CONFIG_KEY_0' => false,
                'GIT_CONFIG_VALUE_0' => false,
                'GIT_SSH_COMMAND' => false,
                'GIT_ASKPASS' => false,
                'SSH_ASKPASS' => false,
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

    /**
     * @param  list<string>  $arguments
     * @param  array<string, string>  $environment
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
            'clone' => 'Git repository initialization',
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
            ($arguments[0] ?? '') === 'rev-parse' => 'The private source directory is not a readable Git checkout. Save the settings again to initialize or reconnect it.',
            default => 'Check GitHub access, the configured branch, and server Git permissions.',
        };

        return $operation.' failed. '.$reason;
    }

    private function unavailableMessage(): string
    {
        if (! $this->supportsGitActions()) {
            return 'Repository operations are intentionally disabled in the automated testing environment.';
        }

        if (! $this->settings()['valid'] || ! $this->settings()['enabled']) {
            return 'Repository operations are disabled. Enable them from Repository settings.';
        }

        if (! function_exists('proc_open')) {
            return 'The PHP runtime cannot launch Git. Ask the hosting administrator whether process execution is available.';
        }

        if (! $this->repositoryExists()) {
            return 'No private application-managed Git checkout is connected. Save the enabled settings to initialize one.';
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
