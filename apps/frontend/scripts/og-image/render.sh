#!/usr/bin/env bash
# Renders og-hobbyhub.html into public/og-hobbyhub.png (1200 × 630, #475) with a headless
# Chrome. Offline: the fonts come from the app's node_modules. Any Chrome or Chromium will do:
#   CHROME=/usr/bin/chromium apps/frontend/scripts/og-image/render.sh
# Under WSL a Windows Chrome works too (CHROME=/mnt/c/Program\ Files/Google/Chrome/Application/chrome.exe):
# the page is staged in a temporary directory of real files and its paths passed through wslpath.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
frontend="$(cd "$here/../.." && pwd)"
out="$frontend/public/og-hobbyhub.png"
chrome="${CHROME:-chromium}"

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/scripts/og-image" "$stage/node_modules/@fontsource-variable"
cp "$here/og-hobbyhub.html" "$stage/scripts/og-image/"
for font in bricolage-grotesque geist; do
  cp -rL "$frontend/node_modules/@fontsource-variable/$font" "$stage/node_modules/@fontsource-variable/"
done

page="$stage/scripts/og-image/og-hobbyhub.html"
shot="$stage/og-hobbyhub.png"
url="file://$page"
target="$shot"
if [[ "$chrome" == *.exe ]]; then
  url="file:$(wslpath -w "$page" | tr '\\' '/')"
  target="$(wslpath -w "$shot")"
fi

"$chrome" --headless --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=5000 \
  --screenshot="$target" "$url"
cp "$shot" "$out"
echo "$out: $(wc -c <"$out") bytes"
