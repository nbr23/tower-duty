#!/bin/sh
set -eu

templates=/etc/tower-duty
webroot=/usr/share/nginx/html
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
    "$templates/index.html" > "$webroot/index.html"

for page in "$templates"/m/*/index.html; do
    [ -f "$page" ] || continue
    map="${page%/index.html}"
    map="${map##*/}"
    sed \
        -e "s|content=\"\.\./\.\./cards/|content=\"${site_url}cards/|g" \
        -e "s|<script>|<meta property=\"og:url\" content=\"${site_url}m/${map}/\"><script>|" \
        "$page" > "$webroot/m/$map/index.html"
done
