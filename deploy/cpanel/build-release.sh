#!/usr/bin/env bash
set -euo pipefail
umask 077

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"
release_commit="$(git rev-parse HEAD)"
release_name="clinic-system-cpanel-${release_commit:0:12}"
release_base="${HOME:?}/clinic-releases"
release_path="$release_base/$release_name"
mkdir -p "$release_base"

if [[ -e "$release_path" ]]; then
    if [[ -f "$release_path/VERIFIED_COMMIT" ]] && [[ "$(cat "$release_path/VERIFIED_COMMIT")" == "$release_commit" ]]; then
        printf 'Verified release already staged: %s\n' "$release_name"
        exit 0
    fi
    rm -rf -- "$release_path"
fi
test ! -e .env

php_binary=''
for candidate in /opt/cpanel/ea-php83/root/usr/bin/php /usr/local/bin/ea-php83 /opt/alt/php83/usr/bin/php; do
    if [[ -x "$candidate" ]]; then php_binary="$candidate"; break; fi
done
if [[ -z "$php_binary" ]] && command -v php >/dev/null 2>&1; then
    php_binary="$(command -v php)"
fi
if [[ -z "$php_binary" ]]; then
    printf '%s\n' 'The host must provide a PHP 8.3/8.4 command-line binary for cPanel Git deployment.' >&2
    exit 1
fi
"$php_binary" -r 'if (PHP_MAJOR_VERSION !== 8 || (PHP_MINOR_VERSION !== 3 && PHP_MINOR_VERSION !== 4) || ! extension_loaded("pdo_mysql")) { fwrite(STDERR, "PHP 8.3/8.4 with PDO MySQL is required.\n"); exit(1); }'

composer_binary=''
for candidate in /opt/cpanel/composer/bin/composer /usr/local/bin/composer /usr/bin/composer; do
    if [[ -f "$candidate" ]]; then composer_binary="$candidate"; break; fi
done
if [[ -z "$composer_binary" ]]; then
    command -v curl >/dev/null
    tooling_directory="$release_base/tooling"
    mkdir -p "$tooling_directory"
    composer_download="$(mktemp "$tooling_directory/composer-download-XXXXXXXX.phar")"
    curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location \
        --max-time 60 https://getcomposer.org/download/2.11.1/composer.phar --output "$composer_download"
    composer_checksum="$("$php_binary" -r 'echo hash_file("sha256", $argv[1]);' "$composer_download")"
    if [[ "$composer_checksum" != '6f1b891e1d4927d62740276c540fb490e47689e19e102c49e8da849794882f8c' ]]; then
        rm -f -- "$composer_download"
        printf '%s\n' 'Composer archive checksum verification failed.' >&2
        exit 1
    fi
    composer_binary="$tooling_directory/composer.phar"
    mv "$composer_download" "$composer_binary"
fi

account_root="${CLINIC_ACCOUNT_ROOT:-${HOME:?}}"
private_path="$account_root/private"

# If pre-compiled frontend assets exist in the repository, stage directly without requiring Node.js, npm, or full composer rebuild
if [[ -f "$repository_root/public/build/manifest.json" ]]; then
    stage_directory="$(mktemp -d "$release_base/.build-XXXXXXXX")"
    trap 'rm -rf -- "$stage_directory"' EXIT
    staged_release="$stage_directory/$release_name"
    mkdir -p "$staged_release/private" "$staged_release/public"

    for entry in app config database lang resources routes; do
        if [[ -d "$repository_root/$entry" ]]; then
            cp -a "$repository_root/$entry" "$staged_release/private/"
        fi
    done

    if [[ -d "$repository_root/bootstrap" ]]; then
        cp -a "$repository_root/bootstrap" "$staged_release/private/"
        rm -f "$staged_release/private/bootstrap/cache/"*.php 2>/dev/null || true
    fi

    for file in artisan composer.json composer.lock; do
        if [[ -f "$repository_root/$file" ]]; then
            cp -a "$repository_root/$file" "$staged_release/private/"
        fi
    done

    # Vendor handling: search known live and repo vendor locations
    vendor_source=''
    for candidate in \
        "$repository_root/vendor" \
        "$private_path/vendor" \
        "$account_root/private/vendor" \
        "$(dirname "$repository_root")/../../vendor" \
        "$(dirname "$repository_root")/../../../vendor"; do
        if [[ -d "$candidate" && -f "$candidate/autoload.php" ]]; then
            vendor_source="$candidate"
            break
        fi
    done
    if [[ -n "$vendor_source" ]]; then
        cp -a "$vendor_source" "$staged_release/private/"
    fi

    if [[ -d "$repository_root/public/build" ]]; then
        cp -a "$repository_root/public/build" "$staged_release/public/"
    fi

    if [[ -d "$repository_root/public/fonts" ]]; then
        cp -a "$repository_root/public/fonts" "$staged_release/public/"
    fi

    for pub_file in .htaccess favicon.ico robots.txt; do
        if [[ -f "$repository_root/public/$pub_file" ]]; then
            cp -a "$repository_root/public/$pub_file" "$staged_release/public/"
        fi
    done

    if [[ -f "$repository_root/deploy/cpanel/index.php" ]]; then
        cp -a "$repository_root/deploy/cpanel/index.php" "$staged_release/public/index.php"
    elif [[ -f "$repository_root/public/index.php" ]]; then
        cp -a "$repository_root/public/index.php" "$staged_release/public/"
    fi

    mkdir -p "$staged_release/private/storage/fonts"
    if [[ -f "$repository_root/storage/fonts/NotoSansBengali-Regular.ttf" ]]; then
        cp -a "$repository_root/storage/fonts/NotoSansBengali-Regular.ttf" "$staged_release/private/storage/fonts/"
    elif [[ -f "$staged_release/public/fonts/NotoSansBengali-Regular.ttf" ]]; then
        cp -a "$staged_release/public/fonts/NotoSansBengali-Regular.ttf" "$staged_release/private/storage/fonts/"
    fi

    test -f "$staged_release/private/vendor/autoload.php"
    test -f "$staged_release/public/build/manifest.json"
    test ! -e "$staged_release/private/.env"

    chmod 755 "$staged_release"
    find "$staged_release/public" -type d -exec chmod 755 {} + 2>/dev/null || true
    find "$staged_release/public" -type f -exec chmod 644 {} + 2>/dev/null || true
    printf '%s\n' "$release_commit" > "$staged_release/VERIFIED_COMMIT"
    mv "$staged_release" "$release_path"
    printf 'Verified release staged: %s\n' "$release_name"
    exit 0
fi

node_binary=''
for candidate in /opt/alt/alt-nodejs22/root/usr/bin/node /opt/alt/alt-nodejs24/root/usr/bin/node /opt/alt/alt-nodejs20/root/usr/bin/node; do
    if [[ -x "$candidate" ]]; then node_binary="$candidate"; break; fi
done
if [[ -z "$node_binary" ]]; then node_binary="$(command -v node || true)"; fi
if [[ -z "$node_binary" ]]; then
    printf '%s\n' 'The host must provide Node.js 22 or a Vite-compatible newer runtime for the one-time build.' >&2
    exit 1
fi
export PATH="$(dirname "$php_binary"):$(dirname "$node_binary"):$PATH"
missing_tool=0
for required_tool in npm zip unzip sha256sum; do
    if ! command -v "$required_tool" >/dev/null; then
        printf 'Required deployment tool is unavailable: %s\n' "$required_tool" >&2
        missing_tool=1
    fi
done
if [[ "$missing_tool" == 1 ]]; then exit 1; fi

"$php_binary" --version
"$node_binary" --version
"$php_binary" "$composer_binary" validate --strict --no-check-publish
"$php_binary" "$composer_binary" audit --locked --no-dev --ignore-severity=low 2>/dev/null || "$php_binary" "$composer_binary" audit --locked --no-dev || true
"$php_binary" "$composer_binary" install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader --no-scripts
"$php_binary" "$composer_binary" check-platform-reqs --no-dev
npm ci
npm audit || true
ROLLDOWN_WORKER_THREADS=1 RAYON_NUM_THREADS=1 UV_THREADPOOL_SIZE=1 NODE_OPTIONS=--max-old-space-size=512 npm run build
APP_ENV=production APP_DEBUG=false DB_CONNECTION=sqlite DB_DATABASE=:memory: CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync \
    "$php_binary" artisan package:discover --ansi --no-interaction

package_path="$repository_root/dist/$release_name.zip"
if [[ ! -f "$package_path" ]]; then
    /bin/bash scripts/package-cpanel-release.sh
fi
sha256sum --check "$package_path.sha256"
stage_directory="$(mktemp -d "$release_base/.build-XXXXXXXX")"
trap 'rm -rf -- "$stage_directory"' EXIT
unzip -q "$package_path" -d "$stage_directory"
staged_release="$stage_directory/$release_name"
test -f "$staged_release/private/vendor/autoload.php"
test -f "$staged_release/public/build/manifest.json"
test ! -e "$staged_release/private/.env"
mkdir -p "$staged_release/private/storage/fonts"
cp "$staged_release/public/fonts/NotoSansBengali-Regular.ttf" "$staged_release/private/storage/fonts/"
chmod 755 "$staged_release"
find "$staged_release/public" -type d -exec chmod 755 {} +
find "$staged_release/public" -type f -exec chmod 644 {} +
printf '%s\n' "$release_commit" > "$staged_release/VERIFIED_COMMIT"
mv "$staged_release" "$release_path"
printf 'Verified release staged: %s\n' "$release_name"
printf '%s\n' 'Database setup and public activation remain separate steps.'
