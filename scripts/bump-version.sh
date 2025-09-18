#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  echo "Usage: $(basename "$0") <semver> [--tag] [--push]" 1>&2
  echo "  - Updates versions in package.json (root and example), Android build.gradle, iOS .xcodeproj, and Info.plists" 1>&2
  echo "  - versionCode/CURRENT_PROJECT_VERSION is computed as <semver> with dots removed (leading zeros stripped)" 1>&2
}

if [[ $# -lt 1 ]]; then
  usage; exit 1
fi

VERSION="$1"; shift || true
DO_TAG=false
DO_PUSH=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) DO_TAG=true ;;
    --push) DO_PUSH=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" 1>&2; usage; exit 1 ;;
  esac
  shift || true
done

if [[ ! "$VERSION" =~ ^[0-9]+(\.[0-9]+){1,2}$ ]]; then
  echo "Error: version must look like MAJOR.MINOR or MAJOR.MINOR.PATCH (e.g. 0.1.2)" 1>&2
  exit 1
fi

# Compute numeric code = version without dots, strip leading zeros (Android/iOS build number)
CODE_RAW="$(printf "%s" "$VERSION" | tr -d '.')"
CODE="$(printf "%s" "$CODE_RAW" | sed -E 's/^0+//')"
[[ -z "$CODE" ]] && CODE=0

echo "[bump-version] Target version: $VERSION (code: $CODE)"

# Update JS package versions (avoid tags/commits)
if [[ -f "$ROOT_DIR/package.json" ]]; then
  ( cd "$ROOT_DIR" && npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null 2>&1 || node -e '
    const fs=require("fs");
    const p=JSON.parse(fs.readFileSync("package.json","utf8"));
    p.version=process.argv[1];
    fs.writeFileSync("package.json", JSON.stringify(p,null,2)+"\n");
  ' "$VERSION" )
fi
if [[ -f "$ROOT_DIR/example/package.json" ]]; then
  ( cd "$ROOT_DIR/example" && npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null 2>&1 || node -e '
    const fs=require("fs");
    const p=JSON.parse(fs.readFileSync("package.json","utf8"));
    p.version=process.argv[1];
    fs.writeFileSync("package.json", JSON.stringify(p,null,2)+"\n");
  ' "$VERSION" )
fi

# Android
ANDROID_BUILD="$ROOT_DIR/android/app/build.gradle"
if [[ -f "$ANDROID_BUILD" ]]; then
  sed -i '' -E "s/versionName[[:space:]]+\"[^\"]+\"/versionName \"$VERSION\"/" "$ANDROID_BUILD"
  sed -i '' -E "s/versionCode[[:space:]]+[0-9]+/versionCode $CODE/" "$ANDROID_BUILD"
  echo "[bump-version] Android updated: versionName=$VERSION, versionCode=$CODE"
fi

# iOS project
IOS_PBXPROJ="$ROOT_DIR/ios/LocalPlusPlus.xcodeproj/project.pbxproj"
if [[ -f "$IOS_PBXPROJ" ]]; then
  sed -i '' -E "s/MARKETING_VERSION[[:space:]]*=[[:space:]]*[^;]+;/MARKETING_VERSION = $VERSION;/g" "$IOS_PBXPROJ"
  sed -i '' -E "s/CURRENT_PROJECT_VERSION[[:space:]]*=[[:space:]]*[^;]+;/CURRENT_PROJECT_VERSION = $CODE;/g" "$IOS_PBXPROJ"
  echo "[bump-version] iOS .xcodeproj updated: MARKETING_VERSION=$VERSION, CURRENT_PROJECT_VERSION=$CODE"
fi

# iOS Info.plists (only if they contain literal numbers rather than $(VAR))
update_plist_version() {
  local plist="$1"
  [[ -f "$plist" ]] || return 0
  if command -v /usr/libexec/PlistBuddy >/dev/null 2>&1; then
    # CFBundleShortVersionString
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$plist" >/dev/null 2>&1 \
      || /usr/libexec/PlistBuddy -c "Add :CFBundleShortVersionString string $VERSION" "$plist" >/dev/null 2>&1 || true
    # CFBundleVersion
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $CODE" "$plist" >/dev/null 2>&1 \
      || /usr/libexec/PlistBuddy -c "Add :CFBundleVersion string $CODE" "$plist" >/dev/null 2>&1 || true
  else
    # Fallback best-effort: replace within a single line (works if key+string are on one line)
    sed -i '' -E "s#(<key>CFBundleShortVersionString</key>[[:space:]]*<string>)[0-9]+(\.[0-9]+){0,2}(</string>)#\\1$VERSION\\3#" "$plist" || true
    sed -i '' -E "s#(<key>CFBundleVersion</key>[[:space:]]*<string>)[0-9]+(</string>)#\\1$CODE\\2#" "$plist" || true
  fi
}

update_plist_version "$ROOT_DIR/ios/LocalPlusPlus/Info.plist"
update_plist_version "$ROOT_DIR/ios/LocalPlusPlusTests/Info.plist"

# Optionally create a commit and tag
if $DO_TAG; then
  ( cd "$ROOT_DIR" && git add . && git commit -m "chore(release): bump to $VERSION (build $CODE)" || true )
  ( cd "$ROOT_DIR" && git tag -a "v$VERSION" -m "v$VERSION" )
  if $DO_PUSH; then
    ( cd "$ROOT_DIR" && git push && git push --tags )
  fi
fi

echo "[bump-version] Done."
