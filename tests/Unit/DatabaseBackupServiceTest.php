<?php

namespace Tests\Unit;

use App\Services\DatabaseBackupSchemaInspector;
use App\Services\DatabaseBackupService;
use Tests\TestCase;
use ZipArchive;

class DatabaseBackupServiceTest extends TestCase
{
    public function test_cpanel_application_package_has_private_and_public_html_layout_without_sensitive_runtime_files(): void
    {
        if (! class_exists(ZipArchive::class)) {
            $this->markTestSkipped('The PHP Zip extension is required.');
        }

        $path = tempnam(sys_get_temp_dir(), 'clinic-cpanel-package-');

        if ($path === false) {
            $this->fail('Could not allocate a temporary archive path.');
        }

        unlink($path);

        try {
            $archive = new ZipArchive;
            $this->assertTrue($archive->open($path, ZipArchive::CREATE | ZipArchive::EXCL));

            $service = new DatabaseBackupService(new DatabaseBackupSchemaInspector);
            $method = new \ReflectionMethod($service, 'writeCpanelApplicationBundle');
            $method->invoke($service, $archive);
            $this->assertTrue($archive->close());

            $reader = new ZipArchive;
            $this->assertTrue($reader->open($path));

            $entries = [];

            for ($index = 0; $index < $reader->numFiles; $index++) {
                $entries[] = $reader->getNameIndex($index);
            }

            $this->assertContains('private/vendor/autoload.php', $entries);
            $this->assertContains('public_html/index.php', $entries);
            $this->assertContains('INSTALLATION.md', $entries);
            $this->assertNotContains('private/.env', $entries);
            $this->assertNotContains('database.sql.gz', $entries);
            $this->assertNotContains('media.zip', $entries);
            $this->assertFalse((bool) array_filter($entries, static fn (string $entry): bool => str_starts_with($entry, 'public_html/storage/')));

            $reader->close();
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }
}
