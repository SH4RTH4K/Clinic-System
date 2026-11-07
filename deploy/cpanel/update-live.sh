#!/usr/bin/env bash
set -euo pipefail
umask 077

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"
repository_root="$(pwd -P)"
release_commit="$(git rev-parse HEAD)"
if [[ -n "${CLINIC_DEPLOY_EXPECTED_COMMIT:-}" && "$release_commit" != "$CLINIC_DEPLOY_EXPECTED_COMMIT" ]]; then
    printf '%s\n' 'The source commit changed after review; deployment stopped.' >&2
    exit 1
fi
account_root="${CLINIC_ACCOUNT_ROOT:-${HOME:?}}"
private_path="$account_root/private"
public_path="$account_root/public_html"
release_base="$account_root/clinic-releases"
release_path="$release_base/clinic-system-cpanel-${release_commit:0:12}"
backup_base="$account_root/clinic-backups"

mkdir -p "$release_base" "$backup_base"
chmod 700 "$release_base" "$backup_base"
exec 9>"$release_base/update-live.lock"
flock -n 9 || { printf '%s\n' 'Another deployment is running.' >&2; exit 1; }

php_binary="${CLINIC_PHP_BINARY:-}"
if [[ -z "$php_binary" ]]; then
    for candidate in /opt/cpanel/ea-php83/root/usr/bin/php /usr/local/bin/ea-php83 /opt/alt/php83/usr/bin/php; do
        if [[ -x "$candidate" ]]; then php_binary="$candidate"; break; fi
    done
fi
test -n "$php_binary"
"$php_binary" -r 'exit(PHP_MAJOR_VERSION === 8 && PHP_MINOR_VERSION === 3 && extension_loaded("pdo_mysql") ? 0 : 1);'

if [[ ! -f "$private_path/.env" || ! -f "$private_path/vendor/autoload.php" || ! -d "$public_path" ]]; then
    printf '%s\n' 'This update task requires an initialized clinic installation.' >&2
    exit 1
fi

register_source_checkout() {
    local registration
    registration="$(mktemp "$private_path/.git-source-XXXXXXXX")"
    printf '%s\n' "$repository_root" > "$registration"
    chmod 600 "$registration"
    mv -f -- "$registration" "$private_path/DEPLOYED_GIT_REPOSITORY"
}

if [[ -L "$private_path" || -L "$public_path" || -e "$private_path/storage/framework/maintenance.php" || -e "$private_path/storage/framework/down" ]]; then
    printf '%s\n' 'Review the existing maintenance mode or linked installation before updating.' >&2
    exit 1
fi

application_sources_match() {
    git cat-file -e "$1^{commit}" 2>/dev/null &&
        git diff --quiet "$1" "$release_commit" -- . \
            ':!deploy/cpanel/update-live.sh' ':!deploy/cpanel/artisan.php' \
            ':!deploy/cpanel/reviewed-migrations.sha256' ':!tests/deployment/test_update_live.py'
}

# Repeated clicks and tooling-only updates must not accumulate code backups.
if [[ -f "$private_path/DEPLOYED_COMMIT" ]]; then
    deployed_commit="$(cat "$private_path/DEPLOYED_COMMIT")"
    if [[ "$deployed_commit" =~ ^[a-f0-9]{40}$ ]] && application_sources_match "$deployed_commit"; then
        register_source_checkout
        printf '%s\n' "$release_commit" > "$private_path/DEPLOYED_COMMIT"
        printf 'Application files already current; deployment recorded as %s.\n' "${release_commit:0:12}"
        exit 0
    fi
fi

# Deployment tooling is not packaged application code. Reuse a verified payload
# when those are the only changes, avoiding another copy on small disk quotas.
artifact_commit="$release_commit"
if [[ ! -f "$release_path/VERIFIED_COMMIT" ]]; then
    for marker in "$release_base"/clinic-system-cpanel-*/VERIFIED_COMMIT; do
        [[ -f "$marker" && ! -L "${marker%/*}" ]] || continue
        cached_commit="$(cat "$marker")"
        [[ "$cached_commit" =~ ^[a-f0-9]{40}$ ]] || continue
        if application_sources_match "$cached_commit"; then
            release_path="${marker%/*}"
            artifact_commit="$cached_commit"
            printf 'Reusing verified application payload: %s\n' "${cached_commit:0:12}"
            break
        fi
    done
fi
# Build before taking the live site offline; failed builds cannot affect it.
if [[ ! -f "$release_path/VERIFIED_COMMIT" ]]; then
    /bin/bash deploy/cpanel/build-release.sh
fi
test "$(cat "$release_path/VERIFIED_COMMIT")" = "$artifact_commit"
test -f "$release_path/private/vendor/autoload.php"
test -f "$release_path/public/build/manifest.json"
test -f "$release_path/public/index.php"
test ! -e "$release_path/private/.env"
test ! -e "$release_path/public/storage"

# Only checksum-reviewed, additive migrations may run automatically. Historical
# edits and removals still require a separate database deployment.
migration_paths=()
reviewed_migrations="$repository_root/deploy/cpanel/reviewed-migrations.sha256"
for migration in "$private_path"/database/migrations/*; do
    [[ -e "$migration" ]] || continue
    name="${migration##*/}"
    if [[ ! -f "$migration" || -L "$migration" || ! -f "$release_path/private/database/migrations/$name" ]] ||
       ! cmp -s "$migration" "$release_path/private/database/migrations/$name"; then
        printf 'Historical migration changed or removed: %s. Review the database upgrade separately.\n' "$name" >&2
        exit 1
    fi
done
for migration in "$release_path"/private/database/migrations/*; do
    [[ -e "$migration" ]] || continue
    name="${migration##*/}"
    if [[ ! -f "$migration" || -L "$migration" ]]; then
        printf 'Unsupported migration entry: %s\n' "$name" >&2
        exit 1
    fi
    [[ ! -e "$private_path/database/migrations/$name" ]] || continue
    checksum="$(sha256sum "$migration")"
    checksum="${checksum%% *}"
    if [[ "$name" != *.php || ! -f "$reviewed_migrations" ]] ||
       ! grep -Fxq -- "$checksum  $name" "$reviewed_migrations"; then
        printf 'New migration needs review: %s. Add its checksum only after verifying a compatible upgrade.\n' "$name" >&2
        exit 1
    fi
    migration_paths+=("$migration")
done

if (( ${#migration_paths[@]} )) && [[ "${CLINIC_DEPLOY_ALLOW_MIGRATIONS:-1}" != 1 ]]; then
    printf '%s\n' 'Reviewed database migrations require a separately enabled deployment setting.' >&2
    exit 1
fi

backup_path="$(mktemp -d "$backup_base/update-${release_commit:0:12}-XXXXXXXX")"
staging_path="$(mktemp -d "$release_base/.update-XXXXXXXX")"
installed_private=()
installed_public=()
maintenance_started=0
deployment_complete=0
artisan() { (cd "$private_path" && "$php_binary" "$repository_root/deploy/cpanel/artisan.php" "$@" --no-interaction); }

cleanup() {
    result=$?
    trap - EXIT
    set +e
    if [[ "$maintenance_started" == 1 && "$deployment_complete" == 0 ]]; then
        rollback_failed=0
        mkdir -p "$backup_path/failed-private" "$backup_path/failed-public"
        for entry in "${installed_private[@]}"; do
            if [[ -e "$private_path/$entry" ]]; then mv "$private_path/$entry" "$backup_path/failed-private/" || rollback_failed=1; fi
            if [[ -e "$backup_path/private/$entry" ]]; then mv "$backup_path/private/$entry" "$private_path/" || rollback_failed=1; fi
        done
        for entry in "${installed_public[@]}"; do
            if [[ -e "$public_path/$entry" ]]; then mv "$public_path/$entry" "$backup_path/failed-public/" || rollback_failed=1; fi
            if [[ -e "$backup_path/public/$entry" ]]; then mv "$backup_path/public/$entry" "$public_path/" || rollback_failed=1; fi
        done
        if [[ "$rollback_failed" == 0 ]]; then
            artisan up >/dev/null 2>&1 || rollback_failed=1
        fi
        if [[ "$rollback_failed" == 0 ]]; then
            printf '%s\n' 'Deployment failed; the previous application files were restored.' >&2
        else
            printf 'Deployment failed; maintenance remains enabled. Recovery files: %s\n' "$backup_path" >&2
        fi
    fi
    rm -rf -- "$staging_path"
    exit "$result"
}
trap cleanup EXIT

mkdir -p "$backup_path/private" "$backup_path/public"
cp -a "$release_path/private" "$staging_path/private"
cp -a "$release_path/public" "$staging_path/public"

# Keep old hashed assets available to pages already open in a browser.
if [[ -d "$public_path/build" ]]; then
    cp -an "$public_path/build/." "$staging_path/public/build/"
fi
if [[ -f "$public_path/.htaccess" ]]; then
    sed -n '/# php -- BEGIN cPanel-generated handler/,/# php -- END cPanel-generated handler/p' \
        "$public_path/.htaccess" >> "$staging_path/public/.htaccess"
fi

private_entries=(app bootstrap config database resources routes vendor artisan composer.json composer.lock)
if [[ -d "$staging_path/private/lang" || -e "$private_path/lang" ]]; then private_entries+=(lang); fi
public_entries=()
find "$staging_path/public" -mindepth 1 -maxdepth 1 -print0 > "$staging_path/public-entries"
while IFS= read -r -d '' entry; do
    entry="${entry##*/}"
    case "$entry" in .env|.git|storage|uploads|hot) printf '%s\n' 'Unexpected runtime path in the public release.' >&2; exit 1 ;; esac
    public_entries+=("$entry")
done < "$staging_path/public-entries"

for entry in "${private_entries[@]}"; do
    if [[ -L "$private_path/$entry" ]]; then printf '%s\n' 'Linked application code requires manual review.' >&2; exit 1; fi
done
for entry in "${public_entries[@]}"; do
    if [[ -L "$public_path/$entry" ]]; then printf '%s\n' 'Linked public code requires manual review.' >&2; exit 1; fi
done


artisan down --render=errors::503 --retry=60 >/dev/null
maintenance_started=1
if (( ${#migration_paths[@]} )); then
    printf '%s\n' 'Creating a private database backup before reviewed migrations.'
    artisan system-health:backup database
    for migration in "${migration_paths[@]}"; do
        printf 'Applying reviewed migration: %s\n' "${migration##*/}"
        artisan migrate --force --realpath --path="$migration"
    done
fi
for entry in "${private_entries[@]}"; do
    if [[ -e "$private_path/$entry" ]]; then mv "$private_path/$entry" "$backup_path/private/"; fi
    installed_private+=("$entry")
    if [[ -e "$staging_path/private/$entry" ]]; then mv "$staging_path/private/$entry" "$private_path/"; fi
done
for entry in "${public_entries[@]}"; do
    if [[ -e "$public_path/$entry" ]]; then mv "$public_path/$entry" "$backup_path/public/"; fi
    installed_public+=("$entry")
    mv "$staging_path/public/$entry" "$public_path/"
done

# Refresh compiled files without flushing application data or setup state.
for command in config:clear route:clear view:clear config:cache route:cache view:cache; do
    artisan "$command" >/dev/null
done
artisan up >/dev/null
register_source_checkout
printf '%s\n' "$release_commit" > "$private_path/DEPLOYED_COMMIT"
deployment_complete=1
printf 'Live application updated to %s. Recovery files: %s\n' "${release_commit:0:12}" "$backup_path"
