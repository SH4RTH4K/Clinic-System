#!/usr/bin/env bash
set -euo pipefail
umask 077

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"
release_commit="$(git rev-parse HEAD)"
account_root="${CLINIC_ACCOUNT_ROOT:-${HOME:?}}"
release_path="$account_root/clinic-releases/clinic-system-cpanel-${release_commit:0:12}"
private_path="$account_root/private"
public_path="$account_root/public_html"
app_url='https://radiant-fuchsia-kangaroo.103-48-119-134.cpanel.site'

test -f "$release_path/VERIFIED_COMMIT"
test "$(cat "$release_path/VERIFIED_COMMIT")" = "$release_commit"
test -f "$release_path/private/vendor/autoload.php"
test -f "$release_path/public/build/manifest.json"

if [[ -e "$private_path" ]]; then
    if [[ -f "$private_path/FILES_INSTALLED_COMMIT" ]] && [[ "$(cat "$private_path/FILES_INSTALLED_COMMIT")" == "$release_commit" ]]; then
        printf '%s\n' 'Release files are already installed; database activation remains pending.'
        exit 0
    fi
    printf '%s\n' 'Refusing to replace an existing private application or environment.' >&2
    exit 1
fi
if [[ -L "$public_path" ]] || [[ -e "$public_path/.env" ]]; then
    printf '%s\n' 'The existing web root requires manual review before replacement.' >&2
    exit 1
fi

private_staging="$account_root/.deploy-private-${release_commit:0:12}"
public_staging="$account_root/.deploy-public-${release_commit:0:12}"
test ! -e "$private_staging"
test ! -e "$public_staging"
cp -a "$release_path/private" "$private_staging"
cp -a "$release_path/public" "$public_staging"
sed \
    -e "s#^APP_URL=.*#APP_URL=$app_url#" \
    -e 's/^DB_DATABASE=.*/DB_DATABASE=jbhomio_clinic/' \
    -e 's/^DB_USERNAME=.*/DB_USERNAME=jbhomio_clinic/' \
    -e 's/^MAIL_MAILER=.*/MAIL_MAILER=array/' \
    "$private_staging/.env.production.example" > "$private_staging/.env"
chmod 700 "$private_staging"
chmod 600 "$private_staging/.env"

cat > "$private_staging/storage/framework/maintenance.php" <<'PHP'
<?php
http_response_code(503);
header('Content-Type: text/html; charset=UTF-8');
header('Retry-After: 60');
header('Cache-Control: no-store');
echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JB Homeo Hall Clinic</title><style>body{font:18px system-ui;margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f8f7;color:#183b31}main{max-width:520px;padding:40px;text-align:center}h1{font-size:30px}p{line-height:1.6}</style><main><h1>JB Homeo Hall Clinic</h1><p>The clinic website is being configured.<br>Please check back shortly.</p></main></html>';
exit;
PHP

backup_path=''
if [[ -d "$public_path" ]]; then
    mkdir -p "$account_root/clinic-backups"
    chmod 700 "$account_root/clinic-backups"
    backup_path="$account_root/clinic-backups/source-$(date -u +%Y%m%dT%H%M%SZ)-${release_commit:0:12}"
    test ! -e "$backup_path"
    if [[ -f "$public_path/.htaccess" ]]; then
        sed -n '/# php -- BEGIN cPanel-generated handler/,/# php -- END cPanel-generated handler/p' \
            "$public_path/.htaccess" >> "$public_staging/.htaccess"
    fi
fi

mv "$private_staging" "$private_path"
if [[ -n "$backup_path" ]]; then mv "$public_path" "$backup_path"; fi
if ! mv "$public_staging" "$public_path"; then
    if [[ -n "$backup_path" ]] && [[ ! -e "$public_path" ]]; then mv "$backup_path" "$public_path"; fi
    printf '%s\n' 'Public file installation failed; the previous web root was restored.' >&2
    exit 1
fi
printf '%s\n' "$release_commit" > "$private_path/FILES_INSTALLED_COMMIT"
printf '%s\n' 'Release files installed with HTTP maintenance mode enabled.'
printf '%s\n' 'Database credentials, schema initialization, administrator provisioning and final activation remain pending.'
