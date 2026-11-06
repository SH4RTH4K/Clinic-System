#!/usr/bin/env bash
set -euo pipefail
umask 077

for php_binary in /opt/cpanel/ea-php83/root/usr/bin/php /usr/local/bin/ea-php83 /opt/alt/php83/usr/bin/php; do
    if [[ -x "$php_binary" ]]; then
        exec "$php_binary" -d display_errors=0 deploy/cpanel/initialize.php "$@"
    fi
done
printf '%s\n' 'PHP 8.3 is required for initialization.' >&2
exit 1
