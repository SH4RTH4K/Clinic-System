# Deployment Guide — JB Homeo Hall Clinic System

> **Target:** Shared cPanel hosting (PHP 8.4, MySQL, Apache with mod_rewrite)  
> **Build environment:** Local Windows machine with Node.js + Composer

---

## Pre-deployment checklist

### ❌ Files that must NEVER be uploaded to the server

| Path | Reason |
|---|---|
| `.env` | Contains DB password, APP_KEY, secrets |
| `.env.*` | Any env variant |
| `database/*.sql` | May contain patient data |
| `database/*.sqlite` | Local dev DB |
| `Prescription.jpeg` | Sample patient record |
| `.phpunit.result.cache` | Dev artefact |
| `node_modules/` | Build dependencies, not needed on server |
| `tests/` | Test suite |
| `.agents/` | AI dev tooling |
| `AGENTS.md` | AI dev tooling |
| `.mcp.json` | Laravel Boost MCP config |
| `boost.json` | Laravel Boost config |
| `.git/` | Version control internals |
| `.antigravityignore` | AI dev tooling |
| `Antigravity-Security-and-Design-Instructions.md` | Internal review doc |

> **Deployment method:** Upload only the contents of the project folder **minus** the above, plus the Vite-built `public/build/` directory. For git-based deployment, ensure `.gitignore` is respected.

---

## Build steps (run on your local machine before uploading)

```bash
# 1. Install PHP dependencies (no dev packages in production)
composer install --no-dev --optimize-autoloader

# 2. Build frontend assets
npm ci
npm run build

# 3. (Optional) Clear local caches before packaging
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

---

## Server setup (run on the cPanel server once, after upload)

```bash
# 1. Create production .env from the template (fill in real values first)
cp .env.production.example .env
nano .env   # or edit via cPanel File Manager

# 2. Generate a fresh APP_KEY (do NOT reuse the local one)
php artisan key:generate

# 3. Run database migrations
php artisan migrate --force

# 4. Seed roles, permissions and the Super Admin account
php artisan db:seed --force
# ⚠ Save the generated Super Admin password — shown once.

# 5. Cache config, routes and views for performance
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. Create the storage symlink (once per deployment)
php artisan storage:link

# 7. Set correct permissions
chmod -R 755 storage bootstrap/cache
chmod -R 644 storage/logs
```

---

## Post-deployment verification

Run these checks after every deployment:

- [ ] `https://yourdomain.com` loads the home page with no mixed-content warnings
- [ ] `https://yourdomain.com/_boost/` returns **404** (Boost is a dev-only package excluded by `--no-dev`)
- [ ] `APP_DEBUG=false` — no stack traces visible on error pages
- [ ] Login page works; incorrect credentials show a generic error (no debug info)
- [ ] Password reset → if SMTP not configured, the error message appears instead of a silent failure
- [ ] Doctor photo upload works and appears on the public site
- [ ] Prescription PDF generates correctly with Bangla text
- [ ] `php artisan about` shows `Environment: production`
- [ ] Browser dev-tools → Network tab on the public home page: **no requests to third-party hosts** (no Unsplash, no Bunny Fonts CDN after Phase 7)

---

## Re-deployment (subsequent deploys)

```bash
# On local machine:
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# On server:
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

> **Session invalidation:** If you rotated `APP_KEY`, run `php artisan session:flush` (or truncate the `sessions` table) to force all users to re-login.

---

## Database backups — cPanel cron

Add this cron job in cPanel → **Cron Jobs** (runs at 02:00 every night):

```
0 2 * * * mysqldump -u clinic_db_user -p'YOUR_DB_PASSWORD' clinic_db_name | gzip > /home/cpaneluser/backups/clinic_$(date +\%Y\%m\%d).sql.gz 2>> /home/cpaneluser/logs/backup.log
```

**Hardening the backup:**

1. **Encrypt before storing** (requires GPG key set up once):
   ```bash
   0 2 * * * mysqldump -u clinic_db_user -p'PASSWORD' clinic_db_name | gzip | gpg --encrypt -r your@email.com > /home/cpaneluser/backups/clinic_$(date +\%Y\%m\%d).sql.gz.gpg
   ```

2. **Transfer off-server** — use cPanel Backup Wizard, or `rsync`/`scp` to a remote location. A backup on the same server is lost if the server is compromised.

3. **Retention policy** — keep 30 daily backups, 12 monthly. Delete older ones:
   ```bash
   find /home/cpaneluser/backups/ -name "*.sql.gz" -mtime +30 -delete
   ```

4. **Test a restore quarterly:**
   ```bash
   gunzip < clinic_YYYYMMDD.sql.gz | mysql -u clinic_db_user -p clinic_db_name_test
   ```

---

## Security checklist (before going live)

- [ ] `APP_DEBUG=false` in production `.env`
- [ ] `APP_ENV=production` in production `.env`
- [ ] `SESSION_SECURE_COOKIE=true` (requires HTTPS to be working first)
- [ ] `SESSION_ENCRYPT=true`
- [ ] `SESSION_LIFETIME=60` (1 hour idle timeout)
- [ ] DB user is NOT `root` — has `SELECT, INSERT, UPDATE, DELETE` only on this database
- [ ] DB password is strong and unique (not shared with any other service)
- [ ] `APP_KEY` was freshly generated on the server with `php artisan key:generate`
- [ ] All seeded account passwords changed from defaults
- [ ] `must_change_password = true` for all initial accounts
- [ ] SMTP configured, or forgot-password routes removed
- [ ] `php artisan route:cache` run (speeds up routing and prevents route discovery)
- [ ] `public/storage/.htaccess` exists (blocks PHP execution in upload directory)
- [ ] `.htaccess` in `public/` blocks dotfiles and adds security headers
- [ ] SSL certificate installed and auto-renewing (Let's Encrypt via cPanel)
- [ ] Backups running and a restore has been tested

---

## Optional future hardening (not implemented — document only)

### Encrypted clinical notes
Add Laravel `encrypted` casts to `diagnosis_notes`, `bp_symptoms_notes`, `known_allergies` in the `Patient` and `Visit` models:
```php
protected $casts = [
    'known_allergies'   => 'encrypted',
    'diagnosis_notes'   => 'encrypted',
    'bp_symptoms_notes' => 'encrypted',
];
```
> ⚠ **Breaking change:** encrypted fields cannot be searched with SQL `LIKE`. Apply only to fields that are never used in search queries. Requires `APP_KEY` to be stable — rotating the key will make existing encrypted data unreadable without a migration script.

### Image metadata stripping (GD)
Re-encode uploaded doctor photos with PHP GD to strip EXIF metadata before storing:
```php
// In DoctorController::store() / update(), after validation:
$image = imagecreatefromstring(file_get_contents($request->file('photo')));
imagejpeg($image, storage_path('app/public/' . $path), 85);
imagedestroy($image);
```
> Requires GD extension on the cPanel server — verify with `phpinfo()` before implementing.

