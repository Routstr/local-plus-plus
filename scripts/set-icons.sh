#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${SCRIPT_DIR%/scripts}"
cd "$REPO_ROOT"

PATH_ARG="${1:-}"
BG_ARG="${2:-}"

ICON_PATH="${PATH_ARG:-$REPO_ROOT/logo.png}"
BG_COLOR="${BG_ARG:-#FFFFFF}"

if [ ! -f "$ICON_PATH" ]; then
  echo "Icon source not found: $ICON_PATH" 1>&2
  echo "Usage: scripts/set-icons.sh [path-to-png] [background-color]" 1>&2
  exit 1
fi

if [ ! -d node_modules/@bam.tech/react-native-make ]; then
  echo "Installing @bam.tech/react-native-make..."
  npm i -D @bam.tech/react-native-make --no-audit --no-fund --loglevel=error >/dev/null 2>&1
fi

echo "Setting iOS icons from $ICON_PATH"
npx react-native set-icon --platform ios --path "$ICON_PATH" >/dev/null

echo "Setting Android icons from $ICON_PATH with background $BG_COLOR"
npx react-native set-icon --platform android --path "$ICON_PATH" --background "$BG_COLOR" >/dev/null

echo "Icons updated for iOS and Android."


