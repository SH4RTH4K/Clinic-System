<?php

namespace App\Services;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class SystemHealthBackupScheduleService
{
    private const SETTINGS_PATH = 'system-health/backup-schedule.json';

    private const DEFAULT_TIME = '02:00';

    /**
     * @return array{enabled: bool, time: string, timezone: string, backup_path: ?string, valid: bool, source: string}
     */
    public function settings(): array
    {
        $disk = Storage::disk('local');
        $path = $disk->path(self::SETTINGS_PATH);

        if (is_link(dirname($path))) {
            return $this->settingsArray(false, self::DEFAULT_TIME, false, 'invalid');
        }

        if (! file_exists($path)) {
            return $this->settingsArray(true, self::DEFAULT_TIME, true, 'default');
        }

        if (is_link($path) || ! is_file($path) || filesize($path) > 4096) {
            return $this->settingsArray(false, self::DEFAULT_TIME, false, 'invalid');
        }

        try {
            $stored = json_decode($disk->get(self::SETTINGS_PATH), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return $this->settingsArray(false, self::DEFAULT_TIME, false, 'invalid');
        }

        if (! is_array($stored)
            || ! is_bool($stored['enabled'] ?? null)
            || ! $this->isValidTime($stored['time'] ?? null)) {
            return $this->settingsArray(false, self::DEFAULT_TIME, false, 'invalid');
        }

        $timezone = isset($stored['timezone']) && is_string($stored['timezone']) && in_array($stored['timezone'], timezone_identifiers_list(), true)
            ? $stored['timezone']
            : null;

        $backupPath = isset($stored['backup_path']) && is_string($stored['backup_path']) && trim($stored['backup_path']) !== ''
            ? trim($stored['backup_path'])
            : null;

        return $this->settingsArray($stored['enabled'], $stored['time'], true, 'saved', $timezone, $backupPath);
    }

    public function save(bool $enabled, string $time, ?string $timezone = null, ?string $backupPath = null): void
    {
        if (! $this->isValidTime($time)) {
            throw new InvalidArgumentException('The backup time must use 24-hour HH:MM format.');
        }

        $validTimezone = (string) config('app.timezone', 'UTC');
        if ($timezone !== null && trim($timezone) !== '') {
            $trimmedTz = trim($timezone);
            if (! in_array($trimmedTz, timezone_identifiers_list(), true)) {
                throw new InvalidArgumentException('The selected timezone is invalid.');
            }
            $validTimezone = $trimmedTz;
        }

        $sanitizedBackupPath = null;
        if ($backupPath !== null && trim($backupPath) !== '') {
            $trimmedPath = trim($backupPath);
            if (! $this->isAbsolutePath($trimmedPath)) {
                throw new InvalidArgumentException('The configured backup path must be absolute.');
            }
            if (str_contains($trimmedPath, '..')) {
                throw new InvalidArgumentException('The backup path cannot contain directory traversals.');
            }
            $realPublicRoot = realpath(public_path());
            $realPath = realpath($trimmedPath);
            if ($realPublicRoot !== false && $realPath !== false) {
                $publicPrefix = rtrim($realPublicRoot, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
                if ($realPath === $realPublicRoot || str_starts_with($realPath.DIRECTORY_SEPARATOR, $publicPrefix)) {
                    throw new InvalidArgumentException('The configured backup path cannot be publicly accessible.');
                }
            }
            $sanitizedBackupPath = $trimmedPath;
        }

        $disk = Storage::disk('local');
        $directory = dirname(self::SETTINGS_PATH);
        $directoryPath = $disk->path($directory);
        $settingsPath = $disk->path(self::SETTINGS_PATH);

        if (is_link($directoryPath) || is_link($settingsPath)) {
            throw new RuntimeException('The backup schedule settings path is unsafe.');
        }

        if (! is_dir($directoryPath) && ! $disk->makeDirectory($directory)) {
            throw new RuntimeException('The backup schedule settings directory could not be created.');
        }

        $temporaryPath = $directory.'/.backup-schedule-'.bin2hex(random_bytes(12)).'.tmp';
        $contents = json_encode([
            'enabled' => $enabled,
            'time' => $time,
            'timezone' => $validTimezone,
            'backup_path' => $sanitizedBackupPath,
        ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);

        try {
            if (! $disk->put($temporaryPath, $contents, ['visibility' => 'private'])) {
                throw new RuntimeException('The backup schedule settings could not be written.');
            }

            if (! $disk->move($temporaryPath, self::SETTINGS_PATH)) {
                throw new RuntimeException('The backup schedule settings could not be saved.');
            }
        } catch (Throwable $exception) {
            if ($disk->exists($temporaryPath)) {
                $disk->delete($temporaryPath);
            }

            throw $exception;
        }
    }

    public function register(Schedule $schedule): void
    {
        $settings = $this->settings();

        if (! $settings['valid'] || ! $settings['enabled']) {
            return;
        }

        $schedule->command('system-health:backup full')
            ->dailyAt($settings['time'])
            ->timezone($settings['timezone'])
            ->withoutOverlapping();
    }

    private function isValidTime(mixed $time): bool
    {
        return is_string($time) && preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $time) === 1;
    }

    private function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, '/') || preg_match('/^[A-Za-z]:[\\\\\/]/', $path) === 1;
    }

    /**
     * @return array{enabled: bool, time: string, timezone: string, backup_path: ?string, valid: bool, source: string}
     */
    private function settingsArray(bool $enabled, string $time, bool $valid, string $source, ?string $timezone = null, ?string $backupPath = null): array
    {
        return [
            'enabled' => $enabled,
            'time' => $time,
            'timezone' => $timezone ?? (string) config('app.timezone', 'UTC'),
            'backup_path' => $backupPath,
            'valid' => $valid,
            'source' => $source,
        ];
    }
}
