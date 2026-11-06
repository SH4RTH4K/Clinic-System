"""Exercise the cPanel updater with disposable files and a fake PHP process."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[2] / 'deploy/cpanel/update-live.sh'


class UpdateLiveTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='clinic update test ')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repository'
        self.account = self.root / 'account'
        self.repo.mkdir()
        subprocess.run(['git', 'init', '-q', str(self.repo)], check=True)
        subprocess.run(['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                        'commit', '--allow-empty', '-qm', 'fixture'], cwd=self.repo, check=True)
        self.commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=self.repo, text=True).strip()
        self.release = self.account / 'clinic-releases' / ('clinic-system-cpanel-' + self.commit[:12])
        for folder, value in [(self.account / 'private', 'old'), (self.release / 'private', 'new')]:
            for entry in ['app', 'bootstrap', 'config', 'resources', 'routes', 'vendor']:
                self.write(folder / entry / 'fixture', value)
            for entry in ['artisan', 'composer.json', 'composer.lock', 'vendor/autoload.php']:
                self.write(folder / entry, value)
            self.write(folder / 'database/migrations/same.php', 'same schema')
        self.write(self.account / 'private/.env', 'preserved environment')
        self.write(self.account / 'private/storage/app/public/upload', 'preserved upload')
        self.write(self.account / 'private/storage/framework/sessions/session', 'preserved session')
        self.write(self.account / 'private/storage/framework/cpanel-initialization.json', 'preserved setup')
        self.write(self.account / 'private/FILES_INSTALLED_COMMIT', 'original installation')
        self.write(self.account / 'public_html/build/manifest.json', 'old manifest')
        self.write(self.account / 'public_html/build/old-hash.js', 'old asset')
        self.write(self.account / 'public_html/index.php', 'old index')
        self.write(self.account / 'public_html/.htaccess', '# php -- BEGIN cPanel-generated handler\nhandler\n# php -- END cPanel-generated handler\n')
        self.write(self.account / 'public_html/uploads/custom', 'public upload')
        self.write(self.release / 'VERIFIED_COMMIT', self.commit)
        self.write(self.release / 'public/build/manifest.json', 'new manifest')
        self.write(self.release / 'public/build/new-hash.js', 'new asset')
        self.write(self.release / 'public/index.php', 'new index')
        self.write(self.release / 'public/.htaccess', 'new rules\n')
        self.php = self.root / 'fake-php'
        self.write(self.php, '''#!/bin/bash
set -eu
if [[ "$1" == -r ]]; then exit 0; fi
printf '%s\\n' "$2" >> "$CLINIC_TEST_COMMANDS"
if [[ "${CLINIC_TEST_FAIL:-}" == "$2" ]]; then exit 42; fi
if [[ "$2" == down ]]; then
  mkdir -p storage/framework
  touch storage/framework/maintenance.php storage/framework/down
fi
if [[ "$2" == up ]]; then rm -f storage/framework/maintenance.php storage/framework/down; fi
''')
        self.php.chmod(0o700)
        self.env = dict(os.environ, CLINIC_ACCOUNT_ROOT=str(self.account), CLINIC_PHP_BINARY=str(self.php),
                        CLINIC_TEST_COMMANDS=str(self.root / 'commands'))

    def write(self, path, contents):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents)

    def deploy(self, **extra):
        return subprocess.run(['bash', str(SOURCE)], cwd=self.repo, env=dict(self.env, **extra),
                              text=True, capture_output=True)

    def assert_runtime_preserved(self):
        for entry, value in {
            '.env': 'preserved environment', 'storage/app/public/upload': 'preserved upload',
            'storage/framework/sessions/session': 'preserved session',
            'storage/framework/cpanel-initialization.json': 'preserved setup',
            'FILES_INSTALLED_COMMIT': 'original installation',
        }.items():
            self.assertEqual((self.account / 'private' / entry).read_text(), value)
        self.assertEqual((self.account / 'public_html/uploads/custom').read_text(), 'public upload')
        self.assertFalse((self.account / 'private/storage/framework/maintenance.php').exists())

    def test_success_updates_code_and_assets_preserving_runtime_and_previous_assets(self):
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.account / 'private/app/fixture').read_text(), 'new')
        self.assertEqual((self.account / 'public_html/build/manifest.json').read_text(), 'new manifest')
        self.assertTrue((self.account / 'public_html/build/old-hash.js').exists())
        self.assertTrue((self.account / 'public_html/build/new-hash.js').exists())
        self.assertIn('handler', (self.account / 'public_html/.htaccess').read_text())
        self.assertEqual((self.account / 'private/DEPLOYED_COMMIT').read_text().strip(), self.commit)
        self.assert_runtime_preserved()
        commands = (self.root / 'commands').read_text().splitlines()
        self.assertEqual(commands, ['down', 'config:clear', 'route:clear', 'view:clear', 'config:cache', 'route:cache', 'view:cache', 'up'])
        self.assertEqual(self.deploy().returncode, 0)
        self.assert_runtime_preserved()

    def test_cache_failure_restores_previous_code_and_manifest_without_changing_runtime(self):
        result = self.deploy(CLINIC_TEST_FAIL='route:cache')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('previous application files were restored', result.stderr)
        self.assertEqual((self.account / 'private/app/fixture').read_text(), 'old')
        self.assertEqual((self.account / 'public_html/build/manifest.json').read_text(), 'old manifest')
        self.assertFalse((self.account / 'private/DEPLOYED_COMMIT').exists())
        self.assert_runtime_preserved()

    def test_schema_change_stops_before_maintenance_or_writes(self):
        self.write(self.release / 'private/database/migrations/new.php', 'new schema')
        result = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('New migration needs review: new.php', result.stderr)
        self.assertFalse((self.root / 'commands').exists())
        self.assertEqual((self.account / 'private/app/fixture').read_text(), 'old')
        self.assert_runtime_preserved()

    def review_new_migration(self):
        migration = self.release / 'private/database/migrations/new.php'
        self.write(migration, 'reviewed additive migration')
        self.write(self.repo / 'deploy/cpanel/reviewed-migrations.sha256',
                   hashlib.sha256(migration.read_bytes()).hexdigest() + '  new.php\n')

    def test_reviewed_migration_is_backed_up_and_applied_before_code_switch(self):
        self.review_new_migration()

        result = self.deploy()

        self.assertEqual(result.returncode, 0, result.stderr)
        commands = (self.root / 'commands').read_text().splitlines()
        self.assertEqual(commands[:4], ['down', 'system-health:backup', 'migrate', 'config:clear'])
        self.assertEqual((self.account / 'private/app/fixture').read_text(), 'new')
        self.assertTrue((self.account / 'private/database/migrations/new.php').exists())
        self.assert_runtime_preserved()

    def test_modified_reviewed_migration_is_rejected_before_backup_or_maintenance(self):
        self.review_new_migration()
        self.write(self.release / 'private/database/migrations/new.php', 'unreviewed change')

        result = self.deploy()

        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / 'commands').exists())
        self.assert_runtime_preserved()

    def test_backup_or_migration_failure_keeps_old_code_and_restores_availability(self):
        self.review_new_migration()
        for command in ['system-health:backup', 'migrate']:
            with self.subTest(command=command):
                result = self.deploy(CLINIC_TEST_FAIL=command)

                self.assertNotEqual(result.returncode, 0)
                self.assertEqual((self.account / 'private/app/fixture').read_text(), 'old')
                self.assertFalse((self.account / 'private/DEPLOYED_COMMIT').exists())
                self.assert_runtime_preserved()

    def test_historical_migration_edits_and_removals_are_rejected(self):
        migration = self.release / 'private/database/migrations/same.php'
        for value in ['edited history', None]:
            with self.subTest(value=value):
                if value is None:
                    migration.unlink()
                else:
                    migration.write_text(value)

                result = self.deploy()

                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Historical migration changed or removed', result.stderr)
                self.assertFalse((self.root / 'commands').exists())
                self.assert_runtime_preserved()

    @unittest.skipUnless(shutil.which('php'), 'PHP is required for the cPanel console integration test')
    def test_cpanel_console_uses_public_html_and_preserves_command_arguments_and_exit_status(self):
        self.write(self.account / 'private/vendor/autoload.php',
                   '<?php namespace Symfony\\Component\\Console\\Input; class ArgvInput {}')
        self.write(self.account / 'private/bootstrap/app.php', '''<?php
return new class {
    private string $publicPath;
    public function usePublicPath(string $path): void { $this->publicPath = $path; }
    public function handleCommand($input): int {
        file_put_contents(getenv('CLINIC_TEST_CAPTURE'), json_encode([
            'public_path' => $this->publicPath, 'arguments' => array_slice($_SERVER['argv'], 1),
        ]));
        return 17;
    }
};
''')
        capture = self.root / 'console.json'

        result = subprocess.run(['php', str(SOURCE.with_name('artisan.php')),
                                 'system-health:backup', 'database', '--no-interaction'],
                                env=dict(self.env, CLINIC_TEST_CAPTURE=str(capture)), capture_output=True)

        self.assertEqual(result.returncode, 17, result.stderr)
        captured = json.loads(capture.read_text())
        self.assertEqual(captured['public_path'], str(self.account / 'public_html'))
        self.assertEqual(captured['arguments'], ['system-health:backup', 'database', '--no-interaction'])

    @unittest.skipUnless(shutil.which('php'), 'PHP is required for the cPanel console integration test')
    def test_cpanel_console_rejects_missing_public_directory_before_bootstrap(self):
        shutil.rmtree(self.account / 'public_html')

        result = subprocess.run(['php', str(SOURCE.with_name('artisan.php')), 'up'],
                                env=self.env, capture_output=True, text=True)

        self.assertEqual(result.returncode, 1)
        self.assertIn('An initialized cPanel installation is required.', result.stderr)

    def test_existing_maintenance_and_concurrent_deployment_are_not_interrupted(self):
        self.write(self.account / 'private/storage/framework/down', 'manual maintenance')
        result = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / 'commands').exists())
        (self.account / 'private/storage/framework/down').unlink()
        with (self.account / 'clinic-releases/update-live.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = self.deploy()
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Another deployment', result.stderr)
        self.assert_runtime_preserved()

    def test_unverified_release_is_rejected_before_live_changes(self):
        self.write(self.release / 'VERIFIED_COMMIT', 'wrong commit')
        self.assertNotEqual(self.deploy().returncode, 0)
        self.assertFalse((self.root / 'commands').exists())
        self.assert_runtime_preserved()

    def commit_file(self, relative_path, content):
        self.write(self.repo / relative_path, content)
        subprocess.run(['git', 'add', relative_path], cwd=self.repo, check=True)
        subprocess.run(['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                        'commit', '-qm', 'fixture change'], cwd=self.repo, check=True)
        return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=self.repo, text=True).strip()

    def test_tooling_only_change_reuses_verified_payload_and_records_new_commit(self):
        new_commit = self.commit_file('deploy/cpanel/update-live.sh', 'tooling change')

        result = self.deploy()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Reusing verified application payload', result.stdout)
        self.assertEqual((self.account / 'private/DEPLOYED_COMMIT').read_text().strip(), new_commit)
        self.assertEqual((self.release / 'VERIFIED_COMMIT').read_text(), self.commit)
        self.assert_runtime_preserved()

    def test_already_deployed_application_records_tooling_commit_without_staging_or_backup(self):
        self.write(self.account / 'private/DEPLOYED_COMMIT', self.commit)
        new_commit = self.commit_file('deploy/cpanel/update-live.sh', 'tooling change')

        result = self.deploy()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Application files already current', result.stdout)
        self.assertEqual((self.account / 'private/DEPLOYED_COMMIT').read_text().strip(), new_commit)
        self.assertFalse((self.account / 'clinic-backups').exists() and
                         list((self.account / 'clinic-backups').glob('update-*')))
        self.assertFalse((self.root / 'commands').exists())
        self.assertEqual((self.account / 'private/app/fixture').read_text(), 'old')
        self.assert_runtime_preserved()

    def test_application_change_requires_a_new_build_instead_of_using_cached_payload(self):
        self.commit_file('app/changed.php', 'application change')
        self.write(self.repo / 'deploy/cpanel/build-release.sh', 'exit 33\n')

        result = self.deploy()

        self.assertEqual(result.returncode, 33)
        self.assertNotIn('Reusing verified application payload', result.stdout)
        self.assertEqual((self.account / 'private/app/fixture').read_text(), 'old')
        self.assert_runtime_preserved()

    def test_failed_staging_copy_removes_partial_files_before_maintenance(self):
        tools = self.root / 'failing-tools'
        self.write(tools / 'cp', '#!/bin/bash\nmkdir -p "$3"\ntouch "$3/partial"\nexit 29\n')
        (tools / 'cp').chmod(0o700)

        result = self.deploy(PATH=str(tools) + os.pathsep + self.env['PATH'])

        self.assertEqual(result.returncode, 29)
        self.assertEqual(list((self.account / 'clinic-releases').glob('.update-*')), [])
        self.assertFalse((self.root / 'commands').exists())
        self.assertEqual((self.account / 'private/app/fixture').read_text(), 'old')
        self.assert_runtime_preserved()

    def test_failed_build_leaves_live_site_available(self):
        shutil.rmtree(self.release)
        self.write(self.repo / 'deploy/cpanel/build-release.sh', 'exit 33\n')
        self.assertNotEqual(self.deploy().returncode, 0)
        self.assertFalse((self.root / 'commands').exists())
        self.assert_runtime_preserved()


if __name__ == '__main__':
    unittest.main()
