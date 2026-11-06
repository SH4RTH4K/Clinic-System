#!/usr/bin/env bash
set -euo pipefail

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"

release_commit="$(git rev-parse HEAD)"
short_commit="${release_commit:0:12}"
package_name="clinic-system-cpanel-${short_commit}"
distribution_directory="$repository_root/dist"
temporary_directory="$(mktemp -d)"
source_directory="$temporary_directory/source"
package_directory="$temporary_directory/$package_name"

cleanup() {
    rm -rf "$temporary_directory"
}
trap cleanup EXIT

copy_directory() {
    mkdir -p "$2"
    cp -a "$1/." "$2/"
}

mkdir -p "$source_directory" "$distribution_directory"

if [[ -f .env ]]; then
    printf '%s\n' 'Refusing to package while a local .env file exists in the checkout.' >&2
    exit 1
fi

if [[ ! -f public/build/manifest.json || -f public/hot ]]; then
    printf '%s\n' 'A fresh Vite build is required and public/hot must be absent.' >&2
    exit 1
fi

if [[ ! -f .env.production.example || ! -f deploy/cpanel/index.php ]]; then
    printf '%s\n' 'Required production template or cPanel front controller is missing.' >&2
    exit 1
fi

git archive "$release_commit" | tar -x -C "$source_directory"

if find "$source_directory" -type f \( -name '*.sql' -o -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db' -o -name '*.log' -o -name '*.pem' -o -name '*.key' \) -print -quit | grep -q .; then
    printf '%s\n' 'Refusing to package a committed database, log, or private-key file.' >&2
    exit 1
fi

mkdir -p "$package_directory/private" "$package_directory/public"

for path in artisan composer.json composer.lock; do
    cp "$source_directory/$path" "$package_directory/private/$path"
done

for directory in app bootstrap config resources routes; do
    if [[ -d "$source_directory/$directory" ]]; then
        if [[ "$directory" == "bootstrap" ]]; then
            copy_directory "$source_directory/$directory" "$package_directory/private/$directory"
            for cache_file in "$package_directory/private/bootstrap/cache/"*.php; do
                if [[ -f "$cache_file" ]]; then rm -f -- "$cache_file"; fi
            done
        else
            copy_directory "$source_directory/$directory" "$package_directory/private/$directory"
        fi
    fi
done

if [[ -d "$source_directory/lang" ]]; then
    copy_directory "$source_directory/lang" "$package_directory/private/lang"
fi

if [[ -d "$source_directory/database/migrations" ]]; then
    mkdir -p "$package_directory/private/database/migrations"
    copy_directory "$source_directory/database/migrations" "$package_directory/private/database/migrations"
fi

(
    shopt -s dotglob nullglob
    for public_entry in "$source_directory/public/"*; do
        case "${public_entry##*/}" in
            build|hot|storage) continue ;;
        esac
        cp -a "$public_entry" "$package_directory/public/"
    done
)
copy_directory public/build "$package_directory/public/build"
cp "$source_directory/deploy/cpanel/index.php" "$package_directory/public/index.php"
copy_directory vendor "$package_directory/private/vendor"

mkdir -p "$package_directory/private/bootstrap/cache"
for manifest in packages.php services.php; do
    if [[ ! -f "bootstrap/cache/$manifest" ]]; then
        printf 'Required Composer package manifest is missing: %s\n' "$manifest" >&2
        exit 1
    fi
    cp "bootstrap/cache/$manifest" "$package_directory/private/bootstrap/cache/$manifest"
done

mkdir -p \
    "$package_directory/private/storage/app/public" \
    "$package_directory/private/storage/framework/cache/data" \
    "$package_directory/private/storage/framework/sessions" \
    "$package_directory/private/storage/framework/views" \
    "$package_directory/private/storage/logs"
touch \
    "$package_directory/private/storage/app/public/.keep" \
    "$package_directory/private/storage/framework/cache/data/.keep" \
    "$package_directory/private/storage/framework/sessions/.keep" \
    "$package_directory/private/storage/framework/views/.keep" \
    "$package_directory/private/storage/logs/.keep"

cp "$source_directory/storage/app/public/.htaccess" \
    "$package_directory/private/storage/app/public/.htaccess"
cp "$source_directory/.env.production.example" "$package_directory/private/.env.production.example"
cp "$source_directory/docs/deployment/cpanel-file-manager.md" "$package_directory/INSTALLATION.md"

if find "$package_directory" \( -type d \( -name .git -o -name node_modules \) -o -type f \( -name .env -o -name '*.sql' -o -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db' -o -name '*.log' -o -name '*.pem' -o -name '*.key' \) \) -print -quit | grep -q .; then
    printf '%s\n' 'Refusing to package a forbidden environment, database, log, key, or development directory.' >&2
    exit 1
fi

if [[ -e "$package_directory/public/storage" ]]; then
    printf '%s\n' 'Refusing to package a public storage path.' >&2
    exit 1
fi

archive_path="$distribution_directory/$package_name.zip"
checksum_path="$archive_path.sha256"

if [[ -e "$archive_path" || -e "$checksum_path" ]]; then
    printf '%s\n' 'Refusing to overwrite an existing release artifact.' >&2
    exit 1
fi

(
    cd "$temporary_directory"
    zip -qr "$archive_path" "$package_name"
)
sha256sum "$archive_path" > "$checksum_path"

printf 'Created %s\n' "$archive_path"
printf 'Created %s\n' "$checksum_path"
