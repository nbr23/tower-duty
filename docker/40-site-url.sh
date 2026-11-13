#!/bin/sh
set -eu

template=/etc/tower-duty/index.html
target=/usr/share/nginx/html/index.html
site_url="${SITE_URL:-}"

[ -n "$site_url" ] || exit 0

case "$site_url" in
    http://?*/ | https://?*/) ;;
    *)
        echo "SITE_URL must be an HTTP(S) URL whose path ends in \"/\"." >&2
        exit 1
        ;;
esac
case "$site_url" in
    *[!A-Za-z0-9._~:/%+-]*)
        echo "SITE_URL must contain no query, fragment, credentials, or special characters." >&2
        exit 1
        ;;
esac

sed \
    -e "s|content=\"\./social-card\.png\"|content=\"${site_url}social-card.png\"|g" \
    -e "s|</head>|<link rel=\"canonical\" href=\"${site_url}\"><meta property=\"og:url\" content=\"${site_url}\"></head>|" \
    "$template" > "$target"
