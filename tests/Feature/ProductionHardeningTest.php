<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionHardeningTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Test 1: storage/.htaccess exists in the repository
    // -------------------------------------------------------------------------

    public function test_storage_htaccess_file_exists(): void
    {
        $this->assertFileExists(
            public_path('storage/.htaccess'),
            'public/storage/.htaccess must exist to block PHP execution in the upload directory.'
        );
    }

    // -------------------------------------------------------------------------
    // Test 2: public/.htaccess denies dotfiles access
    // -------------------------------------------------------------------------

    public function test_public_htaccess_contains_dotfile_deny_rule(): void
    {
        $content = file_get_contents(public_path('.htaccess'));

        $this->assertStringContainsString(
            'FilesMatch "^\."',
            $content,
            'public/.htaccess must deny access to dotfiles.'
        );
    }

    // -------------------------------------------------------------------------
    // Test 3: public/.htaccess contains security headers directives
    // -------------------------------------------------------------------------

    public function test_public_htaccess_contains_security_headers(): void
    {
        $content = file_get_contents(public_path('.htaccess'));

        $this->assertStringContainsString('X-Frame-Options', $content);
        $this->assertStringContainsString('X-Content-Type-Options', $content);
        $this->assertStringContainsString('Referrer-Policy', $content);
    }

    // -------------------------------------------------------------------------
    // Test 4: .env.production.example is committed and does not contain APP_KEY
    // -------------------------------------------------------------------------

    public function test_production_env_example_exists_and_has_no_real_key(): void
    {
        $path = base_path('.env.production.example');

        $this->assertFileExists($path, '.env.production.example must be committed as a deployment template.');

        $content = file_get_contents($path);

        // The key line must not contain a real base64-encoded key — it should be a blank placeholder.
        $this->assertDoesNotMatchRegularExpression(
            '/^APP_KEY\s*=\s*base64:/m',
            $content,
            '.env.production.example must not contain a real APP_KEY value.'
        );

        // Must have APP_DEBUG=false
        $this->assertStringContainsString('APP_DEBUG=false', $content);

        // Must have SESSION_SECURE_COOKIE=true
        $this->assertStringContainsString('SESSION_SECURE_COOKIE=true', $content);

        // Must have SESSION_ENCRYPT=true
        $this->assertStringContainsString('SESSION_ENCRYPT=true', $content);
    }

    // -------------------------------------------------------------------------
    // Test 5: DEPLOYMENT.md exists and covers the backup cron section
    // -------------------------------------------------------------------------

    public function test_deployment_md_exists_with_backup_section(): void
    {
        $path = base_path('DEPLOYMENT.md');

        $this->assertFileExists($path, 'DEPLOYMENT.md must exist with deployment guidance.');

        $content = file_get_contents($path);
        $this->assertStringContainsString('mysqldump', $content, 'DEPLOYMENT.md must document the MySQL backup cron.');
        $this->assertStringContainsString('composer install --no-dev', $content);
    }

    // -------------------------------------------------------------------------
    // Test 6: Password reset — local env with log mailer proceeds normally
    // -------------------------------------------------------------------------

    public function test_password_reset_does_not_show_not_configured_error_in_local_env(): void
    {
        // In the test environment, the log-mailer guard must NOT fire.
        // The guard is: if (production && mail.default === 'log') → abort with errors.
        $this->assertEquals('testing', app()->environment());

        $response = $this->post('/forgot-password', ['email' => 'nonexistent@example.com']);

        // Guard must not produce a 500 in any environment.
        $this->assertNotEquals(500, $response->getStatusCode());

        // In testing the guard never fires, so we get the normal Laravel
        // "user not found" 302 redirect — NOT a response containing our guard message.
        // Verify by checking the response body does not contain our specific string.
        $content = $response->getContent();
        $this->assertStringNotContainsString('not configured', (string) $content);
    }

    // -------------------------------------------------------------------------
    // Test 7: AppServiceProvider does NOT force HTTPS in test/local environment
    // -------------------------------------------------------------------------

    public function test_url_scheme_not_forced_in_test_environment(): void
    {
        // forceScheme('https') is guarded by environment('production').
        // In the test environment it must not be active, or HTTP test URLs break.
        $this->assertNotEquals('production', app()->environment());

        $url = url('/');
        // In tests, the APP_URL is http:// by default — must not be forced to https
        $this->assertStringStartsWith('http://', $url);
    }

    // -------------------------------------------------------------------------
    // Test 8: Home page returns 200 (smoke test — nothing broken by hardening)
    // -------------------------------------------------------------------------

    public function test_public_home_page_still_returns_200(): void
    {
        $this->get('/')->assertStatus(200);
    }
}
