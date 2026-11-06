#!/usr/bin/env bash
set -euo pipefail
umask 077

release_name='clinic-system-cpanel-72c9f5152d97'
release_commit='72c9f5152d9767d0dc0f9179c16a47d52bcfa75b'
artifact_sha256='216d073dd1c318b6b027cce0c88f43e61a090638c672fd5d3229821127ae9120'
package_sha256='287dd5dbd8b15c802eda4eca0d5c61c29cbe92a0188246e4a347eac7672a807a'
release_base="${HOME:?}/clinic-releases"
release_path="$release_base/$release_name"
download_config="$release_base/download.conf"

if [[ -e "$release_path" ]]; then
    if [[ -f "$release_path/VERIFIED_COMMIT" ]] && [[ "$(cat "$release_path/VERIFIED_COMMIT")" == "$release_commit" ]]; then
        printf 'Verified release already staged: %s\n' "$release_name"
        exit 0
    fi
    printf '%s\n' 'Refusing to overwrite an existing unverified release directory.' >&2
    exit 1
fi

if [[ ! -s "$download_config" ]]; then
    printf '%s\n' 'A private download.conf containing the current artifact URL is required.' >&2
    exit 1
fi
chmod 600 "$download_config"

stage_directory="$(mktemp -d "$release_base/.stage-XXXXXXXX")"
trap 'rm -rf -- "$stage_directory"' EXIT

curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location \
    --max-time 180 --config "$download_config" --output "$stage_directory/artifact.zip"
printf '%s  %s\n' "$artifact_sha256" "$stage_directory/artifact.zip" | sha256sum --check --status
unzip -q "$stage_directory/artifact.zip" -d "$stage_directory/artifact"
package_path="$stage_directory/artifact/$release_name.zip"
printf '%s  %s\n' "$package_sha256" "$package_path" | sha256sum --check --status
unzip -q "$package_path" -d "$stage_directory/extracted"
staged_release="$stage_directory/extracted/$release_name"

for required_file in private/vendor/autoload.php private/artisan public/index.php public/.htaccess public/build/manifest.json public/fonts/NotoSansBengali-Regular.ttf; do
    test -f "$staged_release/$required_file"
done
test ! -e "$staged_release/private/.env"
test ! -e "$staged_release/public/.env"
mkdir -p "$staged_release/private/storage/fonts"
cp "$staged_release/public/fonts/NotoSansBengali-Regular.ttf" "$staged_release/private/storage/fonts/"
printf '%s\n' "$release_commit" > "$staged_release/VERIFIED_COMMIT"
mv "$staged_release" "$release_path"
printf 'Verified release staged: %s\n' "$release_name"
printf '%s\n' 'Database setup and public activation remain separate steps.'
