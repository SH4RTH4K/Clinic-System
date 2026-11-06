# cPanel deployment guide — JB Homeo Hall Clinic

> **File Manager only / no SSH or Terminal:** Use [the portable File Manager installation guide](docs/deployment/cpanel-file-manager.md). This document contains some CLI-based operational examples and must not be treated as a way to bypass the separate reviewed database installation and migration gate. The release workflow builds assets and packages files; it does not deploy or change a database.

This guide targets shared cPanel hosting with **PHP 8.3**, MySQL, and Apache. The project dependency lock is resolved for PHP 8.3. Do not assume PHP 8.4 or 8.5 is available on the host.

The repository was developed and tested locally using PHP 8.4.25. That is not a substitute for running the platform checks and smoke tests with the actual PHP 8.3 cPanel runtime before a production release.

## 1. Hosting requirements

In cPanel, select PHP 8.3 for the domain and confirm the command-line PHP version also reports 8.3. If SSH is available, use the host's PHP 8.3 binary explicitly when invoking Composer or Artisan. Do not use `--ignore-platform-reqs`.

Required PHP extensions include PDO MySQL, ctype, fileinfo, filter, hash, mbstring, OpenSSL, session, tokenizer, DOM, XML, and XMLWriter. Verify the actual extensions with cPanel's PHP selector or a private diagnostic page that is removed immediately after use. Do not leave `phpinfo()` publicly accessible.

The host also needs Apache `mod_rewrite`, `mod_headers`, and `mod_mime`, with `.htaccess` overrides enabled for the site's public directory and the linked upload directory. Contact the host if cPanel does not expose these settings.

## 2. Repository and release layout

Keep the Laravel application outside the web document root. A suitable layout is:

```text
/home/CPANEL_USER/apps/clinic/releases/RELEASE_ID/   Laravel application
/home/CPANEL_USER/apps/clinic/shared/.env            private production environment
/home/CPANEL_USER/apps/clinic/shared/storage/         persistent writable data
Domain document root: .../releases/RELEASE_ID/public
```

Configure the domain's document root in cPanel to the release's `public` directory. Never point a public domain at the Laravel project root. Do not upload `.git/`, local `.env` files, SQL dumps, logs, local databases, tests, `node_modules/`, or development tooling.

If the cPanel account cannot set the domain document root to the application's `public` directory, keep the Laravel application outside `public_html` and have the hosting administrator configure a safe public entry point. Do not solve this by exposing the whole project under `public_html`.

## 3. Build a release artifact

Run these commands from the project root before upload. The Node process is needed only for the build and does not run on production.

```bash
composer validate --no-check-publish
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
npm ci
npm run build
```

The committed Composer platform setting targets PHP 8.3. Composer's platform setting controls dependency resolution; it does not prove runtime compatibility. After upload, run `composer check-platform-reqs` using the host's actual PHP 8.3 CLI. Also confirm `composer audit` reports no advisories before creating the release artifact.

Upload the application source, `vendor/`, the built `public/build/` directory, public static assets, migrations, and the tracked `.env.production.example`. Do not upload a real `.env` in the artifact. Keep releases immutable after activation where practical.

The Bengali font is self-hosted at `public/fonts/NotoSansBengali-Regular.ttf` for browser styling and `storage/fonts/NotoSansBengali-Regular.ttf` for prescription PDF generation. Include both files in the release. No external font CDN is used.

## 4. Create the cPanel environment

1. Create a MySQL database and a dedicated database user in cPanel. Grant only the permissions needed for the application on that database; do not use the MySQL root account.
2. Create the production `.env` in the private application/shared directory from `.env.production.example`. Fill placeholders through cPanel's protected file editor or a secure shell session. Set restrictive file permissions so the account's web process can read it but it is not publicly served.
3. Set the actual HTTPS application URL, cPanel database host/name/user, and mail settings. Keep `APP_ENV=production`, `APP_DEBUG=false`, and `SESSION_SECURE_COOKIE=true` after HTTPS is working.
4. Use the database session and cache stores configured in the template. The included migrations create the required tables. Queue processing is configured as `sync`; no persistent worker is required for this deployment.
5. Set SMTP credentials only in the private `.env`. Never add them to Git, a deployment archive, a cron command, or an error report.

`APP_KEY` is blank in the example. Generate a key **only for a brand-new installation** after creating its `.env`. Preserve the existing production key for every subsequent release; changing it invalidates encrypted data and existing sessions. Never replace an existing production `.env` with the example template.

## 5. Activate a release

Before the first activation, confirm the release's `public/.htaccess` is present and the domain document root points to the correct `public` directory. Apache must honor the rewrite, dotfile-deny, and security-header rules in that file.

Configure the persistent storage path outside the release if the host supports it. Ensure `storage/` and `bootstrap/cache/` are writable by the cPanel PHP-FPM account. Avoid world-writable permissions and avoid blanket recursive permission changes.

Laravel's public disk uses `storage/app/public`, with the link `public/storage` pointing to that directory. The tracked `storage/app/public/.htaccess` travels with the disk target and blocks server-side script execution while leaving ordinary images and documents readable. Create the link with:

```bash
php artisan storage:link
```

Before creating the link, inspect any existing `public/storage` path. Do not delete or replace a real directory or its contents to make the command succeed. Back up and reconcile existing uploads first, then have the host create the link or use its supported equivalent. Verify that a legitimate doctor profile image remains accessible and that a test script placed in a non-production test directory cannot execute. Do not upload patient documents to the public disk.

After verifying `.env`, dependencies, storage, and the database connection:

```bash
php artisan about
php artisan migrate:status
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Take a verified database backup before migrations. Review new migrations and their rollback behavior before applying them: do not assume rolling back a release should roll back clinical data. Do not run `db:seed` as a routine deployment step. Review seeders and run only explicitly approved, idempotent production seeding tasks.

If cached configuration or routes need to be rebuilt, use `php artisan optimize:clear` and then regenerate the caches. Confirm the application works before removing the previous release.

## 6. HTTPS and session security

Install and verify the cPanel SSL certificate before enabling secure cookies. The example configures encrypted, HTTP-only, same-site `lax` sessions with a 60-minute idle lifetime, browser-close expiration, and secure cookies. The application forces generated URLs to HTTPS in production. Confirm cPanel's proxy forwards HTTPS state correctly and verify login, logout, password reset, and session expiration through the public HTTPS domain.

Keep `APP_DEBUG=false`. Do not expose `.env`, `.git`, `vendor`, `storage/logs`, backups, or framework cache files through the web root. The public `.htaccess` denies dotfiles and sets baseline browser security headers; verify these rules actually apply on the host.

## 7. Safe deployment and rollback

For each release:

1. Build and test an immutable release artifact.
2. Preserve the current `.env`, application key, and persistent storage.
3. Create and verify a protected database backup before schema changes.
4. Put the application into maintenance mode before the migration window with `php artisan down --retry=60`. Pause queue workers, cron tasks, and other writers that can change users, visits, or prescriptions, if configured.
5. Upload the new release outside the document root, install production Composer dependencies, and verify PHP 8.3 platform requirements.
6. Confirm static assets, fonts, storage link, and Apache rules before activation.
7. Apply reviewed migrations while maintenance mode remains active. For the username migration, verify `php artisan migrate:status` and run the application's approved authentication smoke checks before reopening traffic. For prescription history, run `php artisan prescriptions:verify-history --limit=100` after migrations. Review all reported IDs; the command does not change records. A failed check, missing snapshot, or invalid JSON timing value must keep the application in maintenance mode until manually resolved.
8. Build Laravel caches, run smoke checks, and only then run `php artisan up`. Keep the previous release until verification is complete.

If a release fails, restore the previous code and configuration. Restore database content only from a verified backup and only after assessing writes made since the backup; a code rollback alone does not reverse database changes. Use a maintenance window when a migration is not backward-compatible. Do not delete the previous release or backup until rollback is no longer needed.

The username migration is deliberately non-reversible: rolling it back would remove or weaken login identities. Do not use `migrate:rollback` as a recovery action for that migration. Keep the site unavailable while resolving duplicate usernames or a partially completed upgrade; correct it forward after reviewing the affected accounts.

The prescription lifecycle migration is also forward-only because rollback would remove snapshots, cancellation details, and lifecycle state. It was made restartable because MySQL may retain committed schema changes when a later backfill step fails. If it is interrupted, keep the application down, inspect `php artisan migrate:status`, and rerun `php artisan migrate --force` after addressing the reported cause. The migration fills only missing snapshots and statuses, so completed rows remain unchanged on retry. Do not reconstruct missing historical medicine details from the current catalog. The verifier labels legacy or incomplete provenance for review; PDFs for those records remain blocked until an authorized prescriber records a reviewed version. If a snapshot was previously overwritten, recovery may require an independently verified backup and a separately approved restore procedure. Never restore over a live database as an automatic migration recovery step.

## 8. Backups — security requirements for Step 15

The previous `mysqldump` example placed a database password directly in a scheduled command. Passwords in command arguments may be visible in process listings, shell history, and cron configuration. Do not use that pattern.

Until the dedicated backup/restore work in Step 15 is complete, use cPanel's protected backup facility or an administrator-approved method that keeps credentials out of command arguments and logs. Any automated method must store credentials in a file outside the document root with restrictive permissions, encrypt clinical database backups, transfer a copy off-server, apply documented retention, and alert on failures. Test restores only in an isolated non-production database and record the procedure without including patient data in logs.

Step 15 should establish and test: encrypted backup creation, off-site transfer, retention and deletion, integrity verification, least-privilege credentials, secret rotation, restore authorization, isolated restore testing, recovery time objectives, and a documented incident/recovery procedure. Do not run production backup or restore operations as part of this deployment-hardening step.

## 9. Post-deployment verification

- [ ] cPanel web PHP and CLI both report PHP 8.3, and `composer check-platform-reqs` passes on that runtime.
- [ ] Composer production install and security audit complete without ignored platform requirements or advisories.
- [ ] Domain document root is the Laravel `public` directory; the project root and `.git/` are not web-accessible.
- [ ] `/` loads over HTTPS and there are no mixed-content or third-party font requests.
- [ ] Direct requests for `.env`, `.git/config`, logs, and backup files are denied.
- [ ] `APP_ENV=production` and `APP_DEBUG=false`; error pages reveal no stack traces or secrets.
- [ ] Login, logout, secure cookies, session expiry, and password reset work over HTTPS.
- [ ] Static built assets and Bengali text render correctly.
- [ ] Prescription PDFs render Bengali text using the local font.
- [ ] `public/storage` is a link to the intended public disk, and ordinary doctor images are accessible.
- [ ] Uploaded PHP and other server-side scripts are denied by Apache in the upload directory.
- [ ] Database migrations and a reviewed production seed state are correct; no default credentials remain.
- [ ] Backups are protected from the web root and their restore process is scheduled for Step 15 verification.

## 10. Clinical access auditing and Doctor history

The application records successful patient-detail access, visit-detail access, prescription-history access, and prescription PDF export in the existing Spatie activity log under the `clinical_access` log name. Denied requests to visit-detail and prescription-export endpoints are recorded when an authenticated user and visit identifier are available. Events contain the acting user ID, relevant patient and visit IDs, event type, authorization outcome, required permission for denials, and a server-generated request correlation ID. They do not contain patient names, contact details, diagnoses, symptoms, medicine directions, clinical notes, request bodies, query strings, passwords, or session tokens.

Activity log viewing remains restricted to Super Admins with the existing activity-log view permission. There are no application routes for editing or deleting audit events. Audit writes are best effort: a failed access-log write is reported to the protected application log and does not block a clinical request. Operations should monitor these warnings and decide whether future requirements justify a fail-closed policy for particular actions.

The application does not define a legal audit-retention period and does not automatically purge clinical access events. The clinic must approve a retention, archive, and deletion policy before production use. Backups containing access logs remain subject to the same protection requirements as clinical database backups.

Prescription cancellation requires an active linked Doctor account, the clinical-record and visit viewing permissions, and `visits.cancel`. A Doctor may cancel a prescription assigned to their own Doctor profile. Cancellation of another Doctor's prescription also requires the separately assignable `visits.cancel_other` permission and a documented reason. A prescription with no reliable responsible Doctor attribution cannot be cancelled through this workflow. No role receives `visits.cancel_other` by default, including Super Admin. Cancellation records retain the acting user, acting Doctor profile, reason, and timestamp; the responsible Doctor and prescription snapshots remain unchanged. Repeated cancellation is rejected. Cancellation does not create a replacement prescription.

Historical visits without a reliable responsible Doctor remain unassigned and cannot be finalized by a different Doctor. A covering Doctor should create a separate visit for the shared patient. If the clinic needs to recover an unassigned draft, it requires a separately reviewed assignment or handover workflow; do not assign it during routine access or deployment.

Clinical access audit writes are best effort and do not grant or bypass authorization. Failures emit a warning with the event name and exception class, without patient identifiers or clinical content; if the application logger itself fails, a minimal PHP error-log fallback is attempted. Operations must monitor both Laravel and host PHP error logs and alert on these messages. The clinic must approve an audit-retention, archive, and deletion policy before production use.

Doctor profiles with visit history must be deactivated instead of deleted. Deactivation prevents the linked Doctor account from new finalization and amendment actions while preserving the profile name and snapshots for authorized historical views. A forward-only migration changes the `visits.doctor_id` foreign key to restrict hard deletion; it preserves existing `NULL` values and stops for manual review if orphaned Doctor references are found. Do not roll back this protection as routine recovery. Verify the foreign-key change on an isolated MySQL instance matching the production server before applying it in cPanel; SQLite tests do not establish MySQL locking or foreign-key behavior.
